import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { coursesRoutes } from "./routes/courses";
import { lessonsRoutes } from "./routes/lessons";
import { healthRoutes } from "./routes/health";

const PORT = parseInt(process.env["API_CURSOS_PORT"] ?? "3001", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const app = Fastify({
  logger: {
    level: process.env["NODE_ENV"] === "production" ? "info" : "debug",
    transport:
      process.env["NODE_ENV"] !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap(): Promise<void> {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: [
      process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
    ],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Demasiadas peticiones. Intenta de nuevo en ${String(context.after)}.`,
    }),
  });

  // Routes
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(coursesRoutes, { prefix: "/api/courses" });
  await app.register(lessonsRoutes, { prefix: "/api/lessons" });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    void reply.status(statusCode).send({
      error: error.name,
      message: error.message,
      statusCode,
    });
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 api-cursos corriendo en http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void bootstrap();
