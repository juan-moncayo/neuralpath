import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import { getUserFromHeaders } from "../middleware/plan-guard";

const createCourseSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(50),
  ageMin: z.number().int().min(6).max(14),
  ageMax: z.number().int().min(6).max(14),
  priceCop: z.number().int().min(0),
  thumbnailUrl: z.string().url().optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.string().min(2).max(50).optional(),
  ageMin: z.number().int().min(6).max(14).optional(),
  ageMax: z.number().int().min(6).max(14).optional(),
  priceCop: z.number().int().min(0).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const coursesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/courses — lista pública de cursos publicados
  fastify.get("/", async (request, reply) => {
    const query = request.query as {
      category?: string;
      ageMin?: string;
      ageMax?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(parseInt(query.limit ?? "12", 10), 50);
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.ageMin ? { ageMin: { gte: parseInt(query.ageMin, 10) } } : {}),
      ...(query.ageMax ? { ageMax: { lte: parseInt(query.ageMax, 10) } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { description: { contains: query.search } },
              { category: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          ageMin: true,
          ageMax: true,
          priceCop: true,
          thumbnailUrl: true,
          instructor: { select: { name: true } },
          _count: { select: { lessons: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    return reply.send({
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  // GET /api/courses/:id — detalle de un curso con lecciones
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const course = await prisma.course.findUnique({
      where: { id: request.params.id, isPublished: true },
      include: {
        instructor: { select: { name: true } },
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            durationSecs: true,
            order: true,
            isFree: true,
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return reply.status(404).send({ error: "Curso no encontrado" });
    }

    return reply.send(course);
  });

  // POST /api/courses — crear curso (solo instructor)
  fastify.post("/", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user || !["instructor", "admin"].includes(user.role)) {
      return reply.status(403).send({ error: "Solo los instructores pueden crear cursos" });
    }

    const body = createCourseSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const course = await prisma.course.create({
      data: { ...body.data, instructorId: user.userId },
    });

    return reply.status(201).send(course);
  });

  // PUT /api/courses/:id — editar curso
  fastify.put<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user || !["instructor", "admin"].includes(user.role)) {
      return reply.status(403).send({ error: "No autorizado" });
    }

    const body = updateCourseSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.course.findUnique({
      where: { id: request.params.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: "Curso no encontrado" });
    }

    if (existing.instructorId !== user.userId && user.role !== "admin") {
      return reply.status(403).send({ error: "No puedes editar este curso" });
    }

    const updated = await prisma.course.update({
      where: { id: request.params.id },
      data: body.data,
    });

    return reply.send(updated);
  });

  // POST /api/courses/:id/publish — toggle isPublished
  fastify.post<{ Params: { id: string } }>(
    "/:id/publish",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user || !["instructor", "admin"].includes(user.role)) {
        return reply.status(403).send({ error: "No autorizado" });
      }

      const existing = await prisma.course.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { lessons: true } } },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Curso no encontrado" });
      }

      if (existing.instructorId !== user.userId && user.role !== "admin") {
        return reply.status(403).send({ error: "No puedes publicar este curso" });
      }

      if (!existing.isPublished && existing._count.lessons === 0) {
        return reply.status(400).send({
          error: "El curso debe tener al menos una lección antes de publicarse",
        });
      }

      const updated = await prisma.course.update({
        where: { id: request.params.id },
        data: { isPublished: !existing.isPublished },
      });

      return reply.send({
        id: updated.id,
        isPublished: updated.isPublished,
        message: updated.isPublished ? "Curso publicado ✅" : "Curso despublicado",
      });
    }
  );

  // GET /api/courses/instructor/:userId — cursos del instructor
  fastify.get<{ Params: { userId: string } }>(
    "/instructor/:userId",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user || (user.userId !== request.params.userId && user.role !== "admin")) {
        return reply.status(403).send({ error: "No autorizado" });
      }

      const courses = await prisma.course.findMany({
        where: { instructorId: request.params.userId },
        include: {
          _count: { select: { lessons: true, enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(courses);
    }
  );
};
