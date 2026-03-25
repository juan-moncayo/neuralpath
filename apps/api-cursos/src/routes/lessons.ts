import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";

export const lessonsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/lessons/:id — detalle de una lección
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: request.params.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            isPublished: true,
          },
        },
      },
    });

    if (!lesson) {
      return reply.status(404).send({ error: "Lección no encontrada" });
    }

    if (!lesson.course.isPublished) {
      return reply.status(403).send({ error: "Curso no disponible" });
    }

    // Si la lección no es gratuita, verificar acceso (TODO: JWT check)
    if (!lesson.isFree) {
      const childId = request.headers["x-child-id"] as string | undefined;
      if (!childId) {
        return reply.status(403).send({
          error: "Necesitas estar inscrito en este curso para ver esta lección",
        });
      }

      const enrollment = await prisma.enrollment.findFirst({
        where: { childId, courseId: lesson.courseId },
      });

      if (!enrollment) {
        return reply.status(403).send({
          error: "No estás inscrito en este curso",
        });
      }
    }

    return reply.send(lesson);
  });
};
