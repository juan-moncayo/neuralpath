import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import { getUserFromHeaders } from "../middleware/plan-guard";

const createChildSchema = z.object({
  name: z.string().min(2).max(100),
  age: z.number().int().min(6).max(14),
  avatarEmoji: z.string().min(1).max(10),
  interests: z.array(z.string()).min(1).max(10),
});

export const childrenRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children — lista de hijos del padre autenticado
  fastify.get("/", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user) return reply.status(401).send({ error: "No autorizado" });
    if (!["parent", "admin"].includes(user.role)) {
      return reply.status(403).send({ error: "Solo los padres pueden ver sus hijos" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const children = await prisma.childProfile.findMany({
      where: { parentId: user.userId },
      select: {
        id: true,
        name: true,
        age: true,
        avatarEmoji: true,
        interests: true,
        enrollments: {
          where: { completedAt: null },
          select: { id: true },
        },
        sessions: {
          where: {
            createdAt: { gte: startOfMonth },
            status: "completed",
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = children.map((child) => ({
      id: child.id,
      name: child.name,
      age: child.age,
      avatarEmoji: child.avatarEmoji,
      interests: (() => {
        try { return JSON.parse(child.interests) as string[]; } catch { return []; }
      })(),
      enrollmentsCount: child.enrollments.length,
      sessionsThisMonth: child.sessions.length,
    }));

    return reply.send(result);
  });

  // POST /api/children — crear perfil de hijo
  fastify.post("/", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user) return reply.status(401).send({ error: "No autorizado" });
    if (!["parent", "admin"].includes(user.role)) {
      return reply.status(403).send({ error: "Solo los padres pueden crear perfiles" });
    }

    const body = createChildSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const { name, age, avatarEmoji, interests } = body.data;

    const child = await prisma.childProfile.create({
      data: {
        parentId: user.userId,
        name,
        age,
        avatarEmoji,
        interests: JSON.stringify(interests),
      },
    });

    return reply.status(201).send({
      ...child,
      interests: body.data.interests,
    });
  });
};
