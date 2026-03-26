import logging
import os
import time

import httpx
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY", "")


class STTService:
    async def transcribe(self, audio_bytes: bytes) -> str:
        t0 = time.perf_counter()
        try:
            response = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=("audio.webm", audio_bytes, "audio/webm"),
                language="es",
            )
            ms = (time.perf_counter() - t0) * 1000
            logger.info(f"STT latency: {ms:.0f}ms provider=whisper")
            return response.text
        except Exception as e:
            logger.warning(f"Whisper STT failed: {e}, trying fallback")
            return await self.fallback_transcribe(audio_bytes)

    async def fallback_transcribe(self, audio_bytes: bytes) -> str:
        if not DEEPGRAM_KEY:
            return ""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "https://api.deepgram.com/v1/listen",
                    headers={"Authorization": f"Token {DEEPGRAM_KEY}"},
                    params={"language": "es", "model": "nova-2"},
                    content=audio_bytes,
                    timeout=3.0,
                )
                text: str = r.json()["results"]["channels"][0]["alternatives"][0]["transcript"]
                logger.info("STT fallback=deepgram")
                return text
        except Exception:
            return ""


stt_service = STTService()
