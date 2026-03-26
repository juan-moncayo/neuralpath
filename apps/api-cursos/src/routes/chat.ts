import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import OpenAI from "openai";
import Redis from "ioredis";

const chatSchema = z.object({
  childId: z.string().min(1),
  question: z
    .string()
    .min(1)
    .max(500)
    .transform((s) =>
      // EE-S04: sanitizar — remover < > y patrones de prompt injection
      s
        .replace(/[<>]/g, "")
        .replace(/ignora (el|los|las|tu) (prompt|instruccion|sistema)/gi, "")
        .replace(/olvida (todo|lo anterior)/gi, "")
        .trim()
    ),
});

const DAILY_LIMIT = 20;

let openaiClient: OpenAI | null = null;
let redisClient: Redis | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  }
  return openaiClient;
}

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.on("error", () => {
      // No romper el servidor si Redis no está disponible
    });
  }
  return redisClient;
}

/** Selecciona los 3 chunks más relevantes del transcript */
function selectRelevantChunks(
  transcript: string,
  question: string,
  chunkSize = 500
): string {
  if (!transcript) return "";

  const words = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const chunks: string[] = [];

  for (let i = 0; i < transcript.length; i += chunkSize) {
    chunks.push(transcript.slice(i, i + chunkSize));
  }

  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: words.filter((w) => chunk.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((s) => s.chunk).join("\n\n");
}

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/chat/lesson/:lessonId
  fastify.post<{ Params: { lessonId: string } }>(
    "/lesson/:lessonId",
    async (request, reply) => {
      const body = chatSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "Datos inválidos",
          details: body.error.flatten().fieldErrors,
        });
      }

      const { childId, question } = body.data;
      const { lessonId } = request.params;

      // Rate limit: 20 consultas/día por niño con Redis
      const redis = getRedis();
      const rateKey = `chat:limit:${childId}:${new Date().toISOString().slice(0, 10)}`;

      let dailyCount = 0;
      try {
        const current = await redis.get(rateKey);
        dailyCount = current ? parseInt(current, 10) : 0;
      } catch {
        // Si Redis no está disponible, permitir sin rate limit
      }

      if (dailyCount >= DAILY_LIMIT) {
        return reply.status(429).send({
          error: `Alcanzaste el límite de ${DAILY_LIMIT} preguntas por día. ¡Vuelve mañana! 🌟`,
          code: "DAILY_LIMIT_REACHED",
        });
      }

      // Obtener lección y transcript
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, title: true, transcript: true, courseId: true },
      });

      if (!lesson) {
        return reply.status(404).send({ error: "Lección no encontrada" });
      }

      // Verificar inscripción (si la lección tiene transcript protegido)
      const enrollment = await prisma.enrollment.findFirst({
        where: { childId, courseId: lesson.courseId },
      });

      if (!enrollment) {
        return reply.status(403).send({
          error: "No estás inscrito en este curso",
          code: "NOT_ENROLLED",
        });
      }

      // Seleccionar contexto relevante del transcript
      const context = lesson.transcript
        ? selectRelevantChunks(lesson.transcript, question)
        : "";

      const systemPrompt = `Eres un asistente educativo amigable para niños colombianos.
Respondes en máximo 3 oraciones simples, cálidas y motivadoras en español colombiano.
Usas emojis ocasionalmente para ser más amigable.
Nunca uses lenguaje técnico complejo.
Si no sabes la respuesta, di: "¡Muy buena pregunta! Pregúntale a tu profe sobre esto 😊"
${context ? `\nContexto de la lección "${lesson.title}":\n${context}` : ""}`;

      // Guardar pregunta del niño
      await prisma.chatMessage.create({
        data: { childId, lessonId, role: "child", content: question, tokensUsed: 0 },
      });

      let aiResponse = "";
      let tokensUsed = 0;

      try {
        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        aiResponse =
          completion.choices[0]?.message?.content ??
          "¡Muy buena pregunta! Sigue aprendiendo con curiosidad 🌟";
        tokensUsed = completion.usage?.total_tokens ?? 0;
      } catch {
        // EE-C08: respuesta predefinida si OpenAI falla
        aiResponse =
          "¡Uy! Tuve un problema técnico 😅 Pero no te preocupes, sigue con la lección y pregúntale a tu profe si tienes dudas. ¡Tú puedes! 💪";
      }

      // Guardar respuesta IA
      await prisma.chatMessage.create({
        data: { childId, lessonId, role: "ai", content: aiResponse, tokensUsed },
      });

      // Incrementar contador Redis
      try {
        await redis.incr(rateKey);
        await redis.expire(rateKey, 86400); // 24h
      } catch {
        // Silenciar error de Redis
      }

      return reply.send({
        question,
        answer: aiResponse,
        remainingQuestions: Math.max(0, DAILY_LIMIT - dailyCount - 1),
      });
    }
  );
};
