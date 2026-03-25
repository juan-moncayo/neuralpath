# api-mentor

Servicio Fastify para el módulo **MentorAI** de NeuralPath.

## Pipeline de voz e IA

```
Niño habla → Whisper STT → GPT-4 → ElevenLabs TTS → Avatar D-ID pre-renderizado
```

## Estado

> **En construcción** — Este servicio se implementará en una fase posterior del proyecto.

## Tecnologías planeadas

- **Fastify** (Node.js + TypeScript)
- **OpenAI Whisper** — Reconocimiento de voz (STT)
- **GPT-4** — Generación de respuestas adaptadas por edad
- **ElevenLabs** — Síntesis de voz (TTS) con voces de mentores
- **D-ID** — Avatares pre-renderizados con lip-sync local
- **WebSocket** — Comunicación en tiempo real con el frontend
- **Redis** — Cola de sesiones y rate limiting

## Puertos

- Desarrollo: `http://localhost:3002`

## Reglas de negocio

- **No grabar audio del niño** — Solo procesar en memoria
- Máximo 10 sesiones/mes en plan Free
- Máximo 10 sesiones/mes en plan Pro
- Sesiones ilimitadas en plan Pro (revisión pendiente)
- Feedback automático al padre al finalizar cada sesión (plan Pro)
