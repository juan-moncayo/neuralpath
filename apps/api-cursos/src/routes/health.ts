import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "api-cursos",
      timestamp: new Date().toISOString(),
    });
  });
};
