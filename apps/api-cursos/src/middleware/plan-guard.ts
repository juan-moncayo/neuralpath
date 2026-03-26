import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@neuralpath/database";

export type UserPlan = "free" | "premium" | "pro";

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

export interface JwtPayload {
  userId: string;
  role: string;
  plan: UserPlan;
}

/** Verifica el Bearer JWT del header Authorization usando @fastify/jwt */
export async function getUserFromJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<JwtPayload | null> {
  try {
    await request.jwtVerify();
    const payload = request.user as JwtPayload;
    if (!payload?.userId) {
      await reply.status(401).send({ error: "Token inválido", code: "INVALID_TOKEN" });
      return null;
    }
    return payload;
  } catch {
    await reply.status(401).send({ error: "No autorizado — token requerido", code: "UNAUTHORIZED" });
    return null;
  }
}

/** Verifica que el usuario tenga al menos el plan requerido */
export async function requirePlan(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredPlan: UserPlan
): Promise<boolean> {
  const user = await getUserFromJWT(request, reply);
  if (!user) return false;

  const userRecord = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { plan: true },
  });

  const currentPlan = (userRecord?.plan ?? "free") as UserPlan;
  const hasAccess = PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];

  if (!hasAccess) {
    await reply.status(403).send({
      error: `Necesitas el plan ${requiredPlan} para acceder a este contenido`,
      code: "PLAN_REQUIRED",
      requiredPlan,
      currentPlan,
    });
    return false;
  }

  return true;
}

/** Verifica que el niño esté inscrito en el curso */
export async function requireEnrollment(
  request: FastifyRequest,
  reply: FastifyReply,
  courseId: string
): Promise<boolean> {
  const childId = request.headers["x-child-id"] as string | undefined;

  if (!childId) {
    await reply.status(403).send({ error: "Se requiere perfil del niño", code: "CHILD_REQUIRED" });
    return false;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { childId, courseId },
  });

  if (!enrollment) {
    await reply.status(403).send({ error: "No estás inscrito en este curso", code: "NOT_ENROLLED" });
    return false;
  }

  return true;
}
