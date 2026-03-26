import asyncio
import base64
import json
import logging
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from api.stt import stt_service
from api.llm import llm_service
from api.tts import tts_service
from api.email import send_feedback_email
from db import turso as db
from middleware.auth import verify_jwt

logger = logging.getLogger(__name__)

PLAN_LIMITS: dict[str, int] = {"free": 2, "premium": 0, "pro": 10}
AUDIO_CHUNK_THRESHOLD = 48000  # ~3 seconds of webm audio


async def _send(ws: WebSocket, msg: dict[str, Any]) -> None:
    await ws.send_text(json.dumps(msg))


async def handle_session(websocket: WebSocket, mentor_id: str) -> None:
    await websocket.accept()

    session_id: str | None = None
    history: list[dict[str, str]] = []
    audio_buffer = b""
    scores: list[int] = []
    start_time = 0.0
    mentor: dict[str, Any] | None = None
    child_id: str | None = None

    try:
        # 1. Wait for auth message
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        msg = json.loads(raw)

        if msg.get("type") != "auth":
            await _send(websocket, {"type": "error", "code": "AUTH_FAILED", "message": "Sesión expirada, vuelve a entrar"})
            await websocket.close()
            return

        token: str = msg.get("token", "")
        child_id = msg.get("childId", "")

        # 2. Verify JWT
        try:
            payload = verify_jwt(token)
        except Exception:
            await _send(websocket, {"type": "error", "code": "AUTH_FAILED", "message": "Sesión expirada, vuelve a entrar"})
            await websocket.close()
            return

        user_id: str = payload["userId"]
        plan: str = payload.get("plan", "free")

        # 3. Verify child belongs to user
        child = await db.get_child(child_id)
        if not child or child["parentId"] != user_id:
            await _send(websocket, {"type": "error", "code": "AUTH_FAILED", "message": "Perfil no autorizado"})
            await websocket.close()
            return

        child_name: str = child["name"]

        # 4. Check session limit
        sessions_used = await db.count_sessions_this_month(child_id)
        limit = PLAN_LIMITS.get(plan, 2)
        if limit > 0 and sessions_used >= limit:
            await _send(websocket, {
                "type": "error",
                "code": "LIMIT_REACHED",
                "message": f"Alcanzaste tus {limit} sesiones del mes 😊 Pídele a tu papá que active el Plan Pro",
            })
            await websocket.close()
            return

        # 5. Get mentor
        mentor = await db.get_mentor(mentor_id)
        if not mentor:
            await _send(websocket, {"type": "error", "code": "MENTOR_NOT_FOUND", "message": "Mentor no encontrado"})
            await websocket.close()
            return

        mentor_name: str = mentor["name"]

        # 6. Create session in DB
        session_id = await db.create_session(child_id, mentor_id)
        start_time = time.time()

        # 7. Generate greeting
        greeting = await llm_service.generate(
            mentor_id=mentor_id,
            mentor_name=mentor_name,
            history=[],
            user_text=f"Saluda al niño {child_name} y preséntate brevemente. Una sola frase cálida.",
        )

        # 8. Synthesize greeting audio
        greeting_audio = await tts_service.synthesize(mentor_name, greeting)

        # 9. Send session_ready
        session_ready: dict[str, Any] = {
            "type": "session_ready",
            "sessionId": session_id,
            "mentorName": mentor_name,
            "mentorEmoji": mentor.get("emoji", "🤖"),
            "greeting": greeting,
        }
        await _send(websocket, session_ready)

        # Send greeting audio if available
        if greeting_audio:
            await _send(websocket, {
                "type": "mentor_audio",
                "data": base64.b64encode(greeting_audio).decode(),
                "text": greeting,
            })

        # Main loop
        async for raw_msg in websocket.iter_text():
            try:
                msg = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "audio_chunk":
                chunk_b64 = msg.get("data", "")
                try:
                    chunk = base64.b64decode(chunk_b64)
                except Exception:
                    continue

                audio_buffer += chunk

                if len(audio_buffer) >= AUDIO_CHUNK_THRESHOLD:
                    buf_to_process = audio_buffer
                    audio_buffer = b""

                    # STT
                    t_stt = time.perf_counter()
                    text = await stt_service.transcribe(buf_to_process)
                    stt_ms = (time.perf_counter() - t_stt) * 1000

                    if not text.strip():
                        continue

                    await _send(websocket, {"type": "transcript", "text": text})

                    # LLM
                    t_llm = time.perf_counter()
                    response = await llm_service.generate(mentor_id, mentor_name, history, text)
                    llm_ms = (time.perf_counter() - t_llm) * 1000

                    history.append({"role": "user", "content": text})
                    history.append({"role": "assistant", "content": response})

                    await _send(websocket, {"type": "mentor_text", "text": response})

                    # TTS
                    t_tts = time.perf_counter()
                    audio = await tts_service.synthesize(mentor_name, response)
                    tts_ms = (time.perf_counter() - t_tts) * 1000

                    if audio:
                        await _send(websocket, {
                            "type": "mentor_audio",
                            "data": base64.b64encode(audio).decode(),
                            "text": response,
                        })

                    total_ms = stt_ms + llm_ms + tts_ms
                    await _send(websocket, {
                        "type": "latency",
                        "stt_ms": round(stt_ms),
                        "llm_ms": round(llm_ms),
                        "tts_ms": round(tts_ms),
                        "total_ms": round(total_ms),
                    })
                    logger.info(f"Pipeline: STT={stt_ms:.0f}ms LLM={llm_ms:.0f}ms TTS={tts_ms:.0f}ms total={total_ms:.0f}ms")

                    score_turn = 10 + (5 if len(text.split()) > 5 else 0)
                    scores.append(score_turn)

            elif msg_type == "end_session":
                await _end_session(
                    websocket, session_id, mentor_name, child_name, child_id,
                    history, scores, start_time
                )
                return

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except asyncio.TimeoutError:
        await _send(websocket, {"type": "error", "code": "TIMEOUT", "message": "Tiempo de espera agotado"})
    except Exception as e:
        logger.error(f"Session error: {e}")
    finally:
        if session_id:
            try:
                await db.update_session(session_id, "cancelled", 0, int(time.time() - start_time) if start_time else 0)
            except Exception:
                pass


async def _end_session(
    websocket: WebSocket,
    session_id: str,
    mentor_name: str,
    child_name: str,
    child_id: str,
    history: list[dict[str, str]],
    scores: list[int],
    start_time: float,
) -> None:
    score_total = int(sum(scores) / len(scores)) if scores else 0
    duration_secs = int(time.time() - start_time)

    await db.update_session(session_id, "completed", score_total, duration_secs)

    # Generate feedback with GPT-4
    feedback_points = ["Buena participación.", "Puede practicar más.", "Repasa los temas en casa."]
    try:
        prompt = (
            f"Conversación entre el niño {child_name} y {mentor_name}:\n"
            f"{json.dumps(history[-10:], ensure_ascii=False)}\n\n"
            "Escribe exactamente 3 puntos cortos para el padre en español:\n"
            "1. Fortaleza principal del niño en esta sesión\n"
            "2. Área donde puede mejorar\n"
            "3. Una actividad para practicar en casa esta semana\n"
            "Máximo 2 oraciones por punto. Tono amigable. Formato: solo los 3 puntos numerados."
        )
        fb_response = await llm_service.generate("feedback", "Evaluador", [], prompt)
        lines = [l.strip() for l in fb_response.split("\n") if l.strip() and l.strip()[0].isdigit()]
        if len(lines) >= 3:
            feedback_points = [l[2:].strip() if len(l) > 2 else l for l in lines[:3]]
    except Exception as e:
        logger.warning(f"Feedback generation failed: {e}")

    await db.save_feedback(session_id, feedback_points[0], feedback_points[1], feedback_points[2])

    # Send email to parent
    try:
        child_data = await db.get_child(child_id)
        if child_data:
            parent_email = await db.get_parent_email(child_data["parentId"])
            if parent_email:
                await send_feedback_email(
                    parent_email, child_name, mentor_name,
                    score_total, duration_secs, feedback_points
                )
    except Exception as e:
        logger.warning(f"Could not send feedback email: {e}")

    # Motivational message
    if score_total >= 90:
        message = f"¡Eres una estrella, {child_name}! ⭐⭐⭐⭐⭐"
    elif score_total >= 75:
        message = f"¡Muy bien, {child_name}! Sigue así 💪⭐⭐⭐⭐"
    elif score_total >= 60:
        message = f"¡Buen intento, {child_name}! Practica más 🎯⭐⭐⭐"
    else:
        message = f"¡Sigue intentando, {child_name}! 🚀⭐⭐"

    await websocket.send_text(json.dumps({
        "type": "session_ended",
        "score": score_total,
        "duration_secs": duration_secs,
        "message": message,
    }))
    await websocket.close()
