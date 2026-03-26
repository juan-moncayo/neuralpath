import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import { getUserFromHeaders } from "../middleware/plan-guard";

const createEnrollmentSchema = z.object({
  childId: z.string().min(1),
  courseId: z.string().min(1),
});

const updateProgressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
});

export const enrollmentsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/enrollments — inscribir niño a curso (tras pago aprobado)
  fastify.post("/", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user) {
      return reply.status(401).send({ error: "No autorizado" });
    }

    const body = createEnrollmentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const { childId, courseId } = body.data;

    // Verificar que el niño pertenece al padre (o es admin)
    if (user.role === "parent") {
      const child = await prisma.childProfile.findFirst({
        where: { id: childId, parentId: user.userId },
      });
      if (!child) {
        return reply.status(403).send({ error: "Este perfil no te pertenece" });
      }
    }

    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseId, isPublished: true },
    });

    if (!course) {
      return reply.status(404).send({ error: "Curso no encontrado" });
    }

    // Evitar duplicados
    const existing = await prisma.enrollment.findFirst({
      where: { childId, courseId },
    });

    if (existing) {
      return reply.send({ ...existing, alreadyEnrolled: true });
    }

    const enrollment = await prisma.enrollment.create({
      data: { childId, courseId, progressPct: 0 },
    });

    return reply.status(201).send(enrollment);
  });

  // PUT /api/enrollments/:id/progress — actualizar progreso
  fastify.put<{ Params: { id: string } }>(
    "/:id/progress",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user) {
        return reply.status(401).send({ error: "No autorizado" });
      }

      const body = updateProgressSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "Datos inválidos",
          details: body.error.flatten().fieldErrors,
        });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: request.params.id },
        include: { child: { select: { parentId: true } } },
      });

      if (!enrollment) {
        return reply.status(404).send({ error: "Inscripción no encontrada" });
      }

      // Solo el padre del niño o admin puede actualizar
      if (
        user.role === "parent" &&
        enrollment.child.parentId !== user.userId
      ) {
        return reply.status(403).send({ error: "No autorizado" });
      }

      const { progressPct } = body.data;
      const completedAt =
        progressPct >= 100 && !enrollment.completedAt
          ? new Date()
          : enrollment.completedAt;

      const updated = await prisma.enrollment.update({
        where: { id: request.params.id },
        data: { progressPct, completedAt },
      });

      return reply.send(updated);
    }
  );

  // GET /api/enrollments/child/:childId — cursos activos del niño
  fastify.get<{ Params: { childId: string } }>(
    "/child/:childId",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user) {
        return reply.status(401).send({ error: "No autorizado" });
      }

      // Verificar acceso
      if (user.role === "parent") {
        const child = await prisma.childProfile.findFirst({
          where: { id: request.params.childId, parentId: user.userId },
        });
        if (!child) {
          return reply.status(403).send({ error: "No autorizado" });
        }
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { childId: request.params.childId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              thumbnailUrl: true,
              ageMin: true,
              ageMax: true,
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(enrollments);
    }
  );
};
