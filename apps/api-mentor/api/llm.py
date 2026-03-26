import asyncio
import logging
import os
import time

from openai import AsyncOpenAI, RateLimitError

logger = logging.getLogger(__name__)
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPTS: dict[str, str] = {
    "luna": (
        "Eres la Prof. Luna, tutora de matemáticas para niños de 6 a 10 años. "
        "Hablas simple, cálida y motivadora. Máximo 2 oraciones. "
        "Usas ejemplos con frutas, juguetes o animales. Siempre animas al niño al terminar."
    ),
    "max": (
        "Eres el Dr. Max, tutor de ciencias para niños de 8 a 12 años. "
        "Eres curioso y entusiasta. Haces una pregunta para que el niño descubra. "
        "Máximo 2 oraciones. Analogías simples."
    ),
    "sofia": (
        "You are Miss Sofía, English tutor for kids 6-14. "
        "Speak simply, encourage repetition. Max 2 sentences. "
        "Praise effort always. Mix tiny Spanish if child seems confused."
    ),
    "carlos": (
        "Eres el Profe Carlos, tutor de lectura para niños de 7 a 11 años. "
        "Cuentas mini cuentos y preguntas sobre ellos. Máximo 2 oraciones. "
        "Voz cálida y paciente."
    ),
    "valeria": (
        "Eres la Dra. Valeria, tutora de historia para niños de 10 a 14 años. "
        "Narras como aventuras. Máximo 2 oraciones. Conectas el pasado con el presente."
    ),
    "andres": (
        "Eres el Profe Andrés, tutor de arte para niños de 6 a 12 años. "
        "Creativo y divertido. Describes colores y formas. Máximo 2 oraciones. "
        "Celebras toda expresión artística."
    ),
}

FILTER_PATTERNS: list[str] = [
    "ignora",
    "olvida",
    "instrucciones anteriores",
    "ignore",
    "forget",
    "system prompt",
    "jailbreak",
]


def _get_mentor_key(mentor_name: str) -> str:
    """Map mentor name to system prompt key."""
    name_lower = mentor_name.lower()
    for key in SYSTEM_PROMPTS:
        if key in name_lower:
            return key
    return "luna"


class LLMService:
    async def generate(
        self,
        mentor_id: str,
        mentor_name: str,
        history: list[dict[str, str]],
        user_text: str,
    ) -> str:
        lower = user_text.lower()
        if any(p in lower for p in FILTER_PATTERNS):
            return "Mejor hablemos del tema de hoy. ¿Listo? 😊"

        key = _get_mentor_key(mentor_name)
        system = SYSTEM_PROMPTS.get(key, SYSTEM_PROMPTS["luna"])
        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        messages += history[-6:]
        messages.append({"role": "user", "content": user_text})
        return await self._call_with_backoff(messages, attempt=0)

    async def _call_with_backoff(
        self, messages: list[dict[str, str]], attempt: int
    ) -> str:
        model = "gpt-4-turbo" if attempt < 3 else "gpt-4o-mini"
        try:
            t0 = time.perf_counter()
            r = await openai_client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=120,
                temperature=0.7,
            )
            ms = (time.perf_counter() - t0) * 1000
            logger.info(f"LLM latency: {ms:.0f}ms model={model}")
            return (
                r.choices[0].message.content.strip()
                if r.choices[0].message.content
                else "¡Un momento! 😊"
            )
        except RateLimitError:
            if attempt >= 3:
                return "¡Un momento! Volvemos enseguida. 😊"
            await asyncio.sleep(2**attempt)
            return await self._call_with_backoff(messages, attempt + 1)
        except Exception:
            return "¡Un momento! Volvemos enseguida. 😊"


llm_service = LLMService()
