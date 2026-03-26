import logging
import os
import time

import httpx

logger = logging.getLogger(__name__)

ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_IDS: dict[str, str] = {
    "luna":    os.getenv("ELEVENLABS_VOICE_LUNA", ""),
    "max":     os.getenv("ELEVENLABS_VOICE_MAX", ""),
    "sofia":   os.getenv("ELEVENLABS_VOICE_SOFIA", ""),
    "carlos":  os.getenv("ELEVENLABS_VOICE_CARLOS", ""),
    "valeria": os.getenv("ELEVENLABS_VOICE_VALERIA", ""),
    "andres":  os.getenv("ELEVENLABS_VOICE_ANDRES", ""),
}


def _get_voice_key(mentor_name: str) -> str:
    name_lower = mentor_name.lower()
    for key in VOICE_IDS:
        if key in name_lower:
            return key
    return ""


class TTSService:
    async def synthesize(self, mentor_name: str, text: str) -> bytes:
        key = _get_voice_key(mentor_name)
        voice_id = VOICE_IDS.get(key, "")
        if not voice_id:
            logger.warning(f"No voice_id for mentor {mentor_name}")
            return b""
        try:
            t0 = time.perf_counter()
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers={
                        "xi-api-key": ELEVENLABS_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": text,
                        "model_id": "eleven_turbo_v2",
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                    },
                    timeout=4.0,
                )
                ms = (time.perf_counter() - t0) * 1000
                logger.info(f"TTS latency: {ms:.0f}ms provider=elevenlabs")
                return r.content
        except Exception as e:
            logger.warning(f"ElevenLabs TTS failed: {e}")
            return b""


tts_service = TTSService()
