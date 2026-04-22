"""
NEUR-73: EE-M08 — niño Free alcanza límite durante sesión activa
  → completar la sesión en curso, bloquear solo desde la siguiente
NEUR-77: EE-M02 — pérdida de conexión → reconexión 30s → cierre limpio
"""
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

# NEUR-73: límites por plan
PLAN_LIMITS: dict[str, int] = {"free": 2, "premium": 0, "pro": 10}

# Threshold para procesar audio (~3 segundos de webm)
AUDIO_CHUNK_THRESHOLD = 48000

# NEUR-77: tiempo máximo de espera en reconexión (segundos)
RECONNECT_TIMEOUT = 30


async def _send(ws: WebSocket, msg: dict[str, Any]) -> None:
    """Envío seguro — ignora si la conexión ya cerró."""
    try:
        await ws.send_text(json.dumps(msg))
    except Exception:
        pass  # conexión ya cerrada


async def handle_session(websocket: WebSocket, mentor_id: str) -> None:
    await websocket.accept()

    session_id: str | None = None
    history: list[dict[str, str]] = []
    audio_buffer = b""
    scores: list[int] = []
    start_time = 0.0
    mentor: dict[str, Any] | None = None
    child_id: str | None = None
    child_name: str = ""

    # NEUR-73: flag para saber si ya alcanzó el límite durante la sesión
    limit_reached_during_session = False

    try:
        # ── 1. Auth ──────────────────────────────────────────────────────────
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        msg = json.loads(raw)

        if msg.get("type") != "auth":
            await _send(websocket, {
                "type": "error",
                "code": "AUTH_FAILED",
                "message": "Sesión expirada, vuelve a entrar",
            })
            await websocket.close()
            return

        token: str = msg.get("token", "")
        child_id = msg.get("childId", "")

        # ── 2. Verificar JWT ─────────────────────────────────────────────────
        try:
            payload = verify_jwt(token)
        except Exception:
            await _send(websocket, {
                "type": "error",
                "code": "AUTH_FAILED",
                "message": "Sesión expirada, vuelve a entrar",
            })
            await websocket.close()
            return

        user_id: str = payload["userId"]
        plan: str = payload.get("plan", "free")

        # ── 3. Verificar que el niño pertenece al padre ──────────────────────
        child = await db.get_child(child_id)
        if not child or child["parentId"] != user_id:
            await _send(websocket, {
                "type": "error",
                "code": "AUTH_FAILED",
                "message": "Perfil no autorizado",
            })
            await websocket.close()
            return

        child_name = child["name"]

        # ── 4. NEUR-73: Verificar límite ANTES de iniciar la sesión ─────────
        #    Si ya alcanzó el límite, no se inicia una sesión nueva.
        #    Si lo alcanza DURANTE la sesión → la dejamos terminar (ver loop).
        sessions_used = await db.count_sessions_this_month(child_id)
        limit = PLAN_LIMITS.get(plan, 2)

        if limit > 0 and sessions_used >= limit:
            await _send(websocket, {
                "type": "error",
                "code": "LIMIT_REACHED",
                "message": (
                    f"Alcanzaste tus {limit} sesiones del mes 😊 "
                    "Pídele a tu papá que active el Plan Pro"
                ),
            })
            await websocket.close()
            return

        # ── 5. Obtener mentor ────────────────────────────────────────────────
        mentor = await db.get_mentor(mentor_id)
        if not mentor:
            await _send(websocket, {
                "type": "error",
                "code": "MENTOR_NOT_FOUND",
                "message": "Mentor no encontrado",
            })
            await websocket.close()
            return

        mentor_name: str = mentor["name"]

        # ── 6. Crear sesión en DB ────────────────────────────────────────────
        session_id = await db.create_session(child_id, mentor_id)
        start_time = time.time()

        # ── 7. Saludo del mentor ─────────────────────────────────────────────
        greeting = await llm_service.generate(
            mentor_id=mentor_id,
            mentor_name=mentor_name,
            history=[],
            user_text=f"Saluda al niño {child_name} y preséntate brevemente. Una sola frase cálida.",
        )
        greeting_audio = await tts_service.synthesize(mentor_name, greeting)

        await _send(websocket, {
            "type": "session_ready",
            "sessionId": session_id,
            "mentorName": mentor_name,
            "mentorEmoji": mentor.get("emoji", "🤖"),
            "greeting": greeting,
        })

        if greeting_audio:
            await _send(websocket, {
                "type": "mentor_audio",
                "data": base64.b64encode(greeting_audio).decode(),
                "text": greeting,
            })

        # ── 8. Loop principal ────────────────────────────────────────────────
        async for raw_msg in websocket.iter_text():
            try:
                msg = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            # ── NEUR-73: verificar límite en cada turno ──────────────────────
            # Si alcanza el límite DURANTE la sesión, avisar pero NO cortar.
            # El niño completa su turno actual; al enviar "end_session" termina normal.
            if not limit_reached_during_session and limit > 0:
                current_count = await db.count_sessions_this_month(child_id)
                # La sesión actual ya está contada como "active", no "completed" aún
                # → el límite real pendiente es si completedSessions >= limit
                # Usamos sessions_used + 1 sesión activa
                if current_count >= limit:
                    limit_reached_during_session = True
                    await _send(websocket, {
                        "type": "limit_warning",
                        "message": (
                            f"Esta es tu última sesión del mes 🌟 "
                            "¡Aprovéchala al máximo! Pídele a tu papá que active Plan Pro."
                        ),
                    })

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
                    logger.info(
                        f"Pipeline: STT={stt_ms:.0f}ms LLM={llm_ms:.0f}ms "
                        f"TTS={tts_ms:.0f}ms total={total_ms:.0f}ms"
                    )

                    score_turn = 10 + (5 if len(text.split()) > 5 else 0)
                    scores.append(score_turn)

            elif msg_type == "end_session":
                # NEUR-73: terminar la sesión normal aunque haya alcanzado el límite
                await _end_session(
                    websocket, session_id, mentor_name, child_name, child_id,
                    history, scores, start_time
                )
                return

            elif msg_type == "ping":
                # NEUR-77: heartbeat del cliente
                await _send(websocket, {"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket desconectado — sesión {session_id}")
        # NEUR-77: EE-M02 — esperar reconexión 30s antes de cerrar
        if session_id:
            await _wait_for_reconnect_or_close(session_id, start_time)

    except asyncio.TimeoutError:
        await _send(websocket, {
            "type": "error",
            "code": "TIMEOUT",
            "message": "Tiempo de espera agotado",
        })
    except Exception as e:
        logger.error(f"Error en sesión {session_id}: {e}")
    finally:
        if session_id:
            try:
                duration = int(time.time() - start_time) if start_time else 0
                await db.update_session(session_id, "cancelled", 0, duration)
            except Exception:
                pass


async def _wait_for_reconnect_or_close(session_id: str, start_time: float) -> None:
    """
    NEUR-77: EE-M02 — tras desconexión, esperar RECONNECT_TIMEOUT segundos.
    Si el cliente no reconecta, marcar la sesión como cancelada.
    La reconexión real la maneja el cliente enviando el auth nuevamente.
    """
    logger.info(f"Esperando reconexión {RECONNECT_TIMEOUT}s — sesión {session_id}")
    await asyncio.sleep(RECONNECT_TIMEOUT)
    try:
        duration = int(time.time() - start_time) if start_time else 0
        await db.update_session(session_id, "cancelled", 0, duration)
        logger.info(f"Sesión {session_id} marcada cancelada tras timeout de reconexión")
    except Exception as e:
        logger.warning(f"No se pudo cerrar sesión {session_id}: {e}")


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
    """Finaliza la sesión: guarda score, genera feedback GPT-4, envía email al padre."""
    score_total = int(sum(scores) / len(scores)) if scores else 0
    duration_secs = int(time.time() - start_time)

    await db.update_session(session_id, "completed", score_total, duration_secs)

    # Generar feedback con GPT-4
    feedback_points = [
        "Buena participación.",
        "Puede practicar más.",
        "Repasa los temas en casa.",
    ]
    try:
        prompt = (
            f"Conversación entre el niño {child_name} y {mentor_name}:\n"
            f"{json.dumps(history[-10:], ensure_ascii=False)}\n\n"
            "Escribe exactamente 3 puntos cortos para el padre en español:\n"
            "1. Fortaleza principal del niño en esta sesión\n"
            "2. Área donde puede mejorar\n"
            "3. Una actividad para practicar en casa esta semana\n"
            "Máximo 2 oraciones por punto. Tono amigable. "
            "Formato: solo los 3 puntos numerados."
        )
        fb_response = await llm_service.generate("feedback", "Evaluador", [], prompt)
        lines = [
            l.strip()
            for l in fb_response.split("\n")
            if l.strip() and l.strip()[0].isdigit()
        ]
        if len(lines) >= 3:
            feedback_points = [l[2:].strip() if len(l) > 2 else l for l in lines[:3]]
    except Exception as e:
        logger.warning(f"Feedback generation failed: {e}")

    await db.save_feedback(
        session_id, feedback_points[0], feedback_points[1], feedback_points[2]
    )

    # Enviar email al padre
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
        logger.warning(f"No se pudo enviar email de feedback: {e}")

    # Mensaje motivador según score
    if score_total >= 90:
        message = f"¡Eres una estrella, {child_name}! ⭐⭐⭐⭐⭐"
    elif score_total >= 75:
        message = f"¡Muy bien, {child_name}! Sigue así 💪⭐⭐⭐⭐"
    elif score_total >= 60:
        message = f"¡Buen intento, {child_name}! Practica más 🎯⭐⭐⭐"
    else:
        message = f"¡Sigue intentando, {child_name}! 🚀⭐⭐"

    await _send(websocket, {
        "type": "session_ended",
        "score": score_total,
        "duration_secs": duration_secs,
        "message": message,
    })
    try:
        await websocket.close()
    except Exception:
        pass