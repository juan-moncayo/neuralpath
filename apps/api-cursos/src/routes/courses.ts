import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";

const createCourseSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(50),
  ageMin: z.number().int().min(4).max(18),
  ageMax: z.number().int().min(4).max(18),
  priceCop: z.number().int().min(0),
  thumbnailUrl: z.string().url().optional(),
});

export const coursesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/courses — lista pública de cursos publicados
  fastify.get("/", async (request, reply) => {
    const query = request.query as {
      category?: string;
      ageMin?: string;
      ageMax?: string;
      page?: string;
      limit?: string;
    };

    const page = parseInt(query.page ?? "1", 10);
    const limit = Math.min(parseInt(query.limit ?? "12", 10), 50);
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.ageMin ? { ageMin: { gte: parseInt(query.ageMin, 10) } } : {}),
      ...(query.ageMax ? { ageMax: { lte: parseInt(query.ageMax, 10) } } : {}),
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

  // GET /api/courses/:id — detalle de un curso
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

  // POST /api/courses — crear curso (instructor)
  fastify.post("/", async (request, reply) => {
    const body = createCourseSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    // TODO: extraer instructorId del JWT
    const instructorId = (request.headers["x-instructor-id"] as string) ?? "";
    if (!instructorId) {
      return reply.status(401).send({ error: "No autorizado" });
    }

    const course = await prisma.course.create({
      data: { ...body.data, instructorId },
    });

    return reply.status(201).send(course);
  });
};
