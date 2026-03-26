import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import { getUserFromHeaders, requireEnrollment } from "../middleware/plan-guard";
import { createUploadUrl } from "../services/mux";

const createLessonSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().min(1),
  isFree: z.boolean().default(false),
  transcript: z.string().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  order: z.number().int().min(1).optional(),
  isFree: z.boolean().optional(),
  transcript: z.string().optional(),
});

export const lessonsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/lessons/courses/:courseId — crear lección
  fastify.post<{ Params: { courseId: string } }>(
    "/courses/:courseId",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return reply.status(403).send({ error: "Solo los instructores pueden crear lecciones" });
      }

      const body = createLessonSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          error: "Datos inválidos",
          details: body.error.flatten().fieldErrors,
        });
      }

      const course = await prisma.course.findUnique({
        where: { id: request.params.courseId },
      });

      if (!course) {
        return reply.status(404).send({ error: "Curso no encontrado" });
      }

      if (course.instructorId !== user.userId && user.role !== "admin") {
        return reply.status(403).send({ error: "No puedes agregar lecciones a este curso" });
      }

      const lesson = await prisma.lesson.create({
        data: {
          courseId: request.params.courseId,
          title: body.data.title,
          order: body.data.order,
          isFree: body.data.isFree,
          transcript: body.data.transcript,
        },
      });

      return reply.status(201).send(lesson);
    }
  );

  // PUT /api/lessons/:id — editar lección
  fastify.put<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user || !["instructor", "admin"].includes(user.role)) {
      return reply.status(403).send({ error: "No autorizado" });
    }

    const body = updateLessonSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: request.params.id },
      include: { course: { select: { instructorId: true } } },
    });

    if (!lesson) {
      return reply.status(404).send({ error: "Lección no encontrada" });
    }

    if (lesson.course.instructorId !== user.userId && user.role !== "admin") {
      return reply.status(403).send({ error: "No puedes editar esta lección" });
    }

    const updated = await prisma.lesson.update({
      where: { id: request.params.id },
      data: body.data,
    });

    return reply.send(updated);
  });

  // GET /api/lessons/:id/watch — retorna videoUrl si tiene acceso
  fastify.get<{ Params: { id: string } }>(
    "/:id/watch",
    async (request, reply) => {
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

      // Si es gratuita, permitir sin validación
      if (lesson.isFree) {
        return reply.send({
          id: lesson.id,
          title: lesson.title,
          videoUrl: lesson.videoUrl,
          muxPlaybackId: lesson.muxAssetId ? extractPlaybackId(lesson.videoUrl) : null,
          transcript: lesson.transcript,
          durationSecs: lesson.durationSecs,
          isFree: true,
        });
      }

      // Si no es gratuita, verificar inscripción
      const childId = request.headers["x-child-id"] as string | undefined;
      const userId = request.headers["x-user-id"] as string | undefined;

      // Admins e instructores tienen acceso
      const role = (request.headers["x-user-role"] as string | undefined) ?? "parent";
      if (["admin", "instructor"].includes(role)) {
        return reply.send({ id: lesson.id, title: lesson.title, videoUrl: lesson.videoUrl, transcript: lesson.transcript, durationSecs: lesson.durationSecs, isFree: lesson.isFree });
      }

      if (!childId || !userId) {
        return reply.status(403).send({
          error: "Necesitas estar inscrito para ver esta lección",
          code: "NOT_ENROLLED",
        });
      }

      const hasAccess = await requireEnrollment(request, reply, lesson.course.id);
      if (!hasAccess) return;

      return reply.send({
        id: lesson.id,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        muxPlaybackId: lesson.muxAssetId ? extractPlaybackId(lesson.videoUrl) : null,
        transcript: lesson.transcript,
        durationSecs: lesson.durationSecs,
        isFree: lesson.isFree,
      });
    }
  );

  // POST /api/lessons/:id/upload-url — genera URL de subida Mux
  fastify.post<{ Params: { id: string } }>(
    "/:id/upload-url",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return reply.status(403).send({ error: "No autorizado" });
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: request.params.id },
        include: { course: { select: { instructorId: true } } },
      });

      if (!lesson) {
        return reply.status(404).send({ error: "Lección no encontrada" });
      }

      if (lesson.course.instructorId !== user.userId && user.role !== "admin") {
        return reply.status(403).send({ error: "No autorizado" });
      }

      try {
        const { uploadUrl, assetId } = await createUploadUrl(lesson.id);

        // Guardar el muxAssetId provisional
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { muxAssetId: assetId },
        });

        return reply.send({ uploadUrl, assetId });
      } catch (_err) {
        return reply.status(503).send({
          error: "No se pudo generar la URL de subida. Intenta más tarde.",
        });
      }
    }
  );
};

function extractPlaybackId(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  // Mux HLS URLs: https://stream.mux.com/{PLAYBACK_ID}.m3u8
  const match = videoUrl.match(/stream\.mux\.com\/([^.]+)/);
  return match ? match[1] ?? null : null;
}
