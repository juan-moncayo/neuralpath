import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@neuralpath/database";

export type UserPlan = "free" | "premium" | "pro";

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

/** Extrae userId y plan del header x-user-id / x-user-plan enviados por el frontend */
export function getUserFromHeaders(request: FastifyRequest): {
  userId: string;
  plan: UserPlan;
  role: string;
} | null {
  const userId = request.headers["x-user-id"] as string | undefined;
  const plan = (request.headers["x-user-plan"] as string | undefined) ?? "free";
  const role = (request.headers["x-user-role"] as string | undefined) ?? "parent";

  if (!userId) return null;

  return {
    userId,
    plan: (plan as UserPlan) ?? "free",
    role,
  };
}

/** Verifica que el usuario tenga al menos el plan requerido */
export async function requirePlan(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredPlan: UserPlan
): Promise<boolean> {
  const user = getUserFromHeaders(request);

  if (!user) {
    await reply.status(401).send({
      error: "No autorizado",
      code: "UNAUTHORIZED",
    });
    return false;
  }

  // También verificar en BD que la suscripción esté activa
  const userRecord = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { plan: true },
  });

  const currentPlan = (userRecord?.plan ?? "free") as UserPlan;
  const hasAccess =
    PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];

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
    await reply.status(403).send({
      error: "Se requiere perfil del niño",
      code: "CHILD_REQUIRED",
    });
    return false;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { childId, courseId },
  });

  if (!enrollment) {
    await reply.status(403).send({
      error: "No estás inscrito en este curso",
      code: "NOT_ENROLLED",
    });
    return false;
  }

  return true;
}
