import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { z } from "zod";
import { getUserFromHeaders } from "../middleware/plan-guard";
import {
  buildCheckoutUrl,
  copToCents,
  getTransactionByReference,
  verifyWebhookSignature,
} from "../services/wompi";
import { sendPaymentConfirmationEmail } from "../services/email";

const PLAN_PRICES_COP: Record<string, number> = {
  premium: 29900,
  pro: 59900,
};

const checkoutSchema = z.object({
  plan: z.enum(["premium", "pro"]),
  courseId: z.string().optional(),
  customerEmail: z.string().email(),
  redirectUrl: z.string().url(),
});

// ─── NEUR-47: procesar pago aprobado + enviar email de confirmación ──────────
async function processApprovedPayment(
  wompiRef: string,
  plan: string,
  courseId: string | undefined,
  userId: string,
  amountCop: number
): Promise<void> {
  // 1. Actualizar PaymentCop
  await prisma.paymentCop.update({
    where: { wompiRef },
    data: { status: "approved", paidAt: new Date() },
  });

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  if (plan === "premium" || plan === "pro") {
    // 2. Crear suscripción activa
    await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: "active",
        wompiId: wompiRef,
        periodStart,
        periodEnd,
      },
    });

    // 3. Actualizar plan del usuario
    await prisma.user.update({
      where: { id: userId },
      data: { plan },
    });

    // 4. NEUR-47: Enviar email de confirmación al padre (no bloqueante)
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      })
      .then((user) => {
        if (!user) return;
        void sendPaymentConfirmationEmail({
          parentEmail: user.email,
          parentName: user.name,
          plan,
          amountCop,
          wompiRef,
          periodStart,
          periodEnd,
        });
      })
      .catch((err: unknown) => {
        console.error("[payments] Error obteniendo usuario para email:", err);
      });
  }

  void courseId; // el enrollment se crea en el frontend (necesita childId)
}

export const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── POST /api/payments/checkout ─────────────────────────────────────────
  fastify.post("/checkout", async (request, reply) => {
    const user = getUserFromHeaders(request);
    if (!user) {
      return reply.status(401).send({ error: "No autorizado" });
    }

    const body = checkoutSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Datos inválidos",
        details: body.error.flatten().fieldErrors,
      });
    }

    const { plan, courseId, customerEmail, redirectUrl } = body.data;
    const amountCop = PLAN_PRICES_COP[plan] ?? 29900;
    const amountCents = copToCents(amountCop);
    const reference = `np-${plan}-${user.userId}-${Date.now()}`;

    // EE-C06: evitar compra duplicada de plan activo
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });

    if (existingUser?.plan === plan) {
      return reply.status(409).send({
        error: "Ya tienes este plan activo. ¡A aprender! 🚀",
        code: "PLAN_ALREADY_ACTIVE",
      });
    }

    // Crear registro pendiente
    await prisma.paymentCop.create({
      data: {
        userId: user.userId,
        amountCop,
        plan,
        courseId,
        method: "wompi",
        wompiRef: reference,
        status: "pending",
      },
    });

    const checkoutUrl = buildCheckoutUrl({
      reference,
      amountCents,
      currency: "COP",
      customerEmail,
      redirectUrl,
    });

    return reply.send({ checkoutUrl, reference });
  });

  // ─── POST /api/payments/webhook ──────────────────────────────────────────
  fastify.post("/webhook", async (request, reply) => {
    const timestamp = request.headers["x-event-checksum-timestamp"] as string | undefined;
    const checksum = request.headers["x-event-checksum"] as string | undefined;

    if (timestamp && checksum) {
      const rawBody = JSON.stringify(request.body);
      const isValid = verifyWebhookSignature(rawBody, checksum, timestamp);
      if (!isValid) {
        fastify.log.warn("Webhook Wompi con firma inválida");
        return reply.status(401).send({ error: "Firma inválida" });
      }
    }

    const event = request.body as {
      event: string;
      data: {
        transaction: {
          id: string;
          status: string;
          reference: string;
          amount_in_cents: number;
          payment_method_type?: string;
        };
      };
    };

    const { transaction } = event.data ?? {};
    if (!transaction) {
      return reply.status(200).send({ ok: true });
    }

    const payment = await prisma.paymentCop.findUnique({
      where: { wompiRef: transaction.reference },
      include: { user: { select: { id: true } } },
    });

    if (!payment) {
      fastify.log.warn({ reference: transaction.reference }, "PaymentCop no encontrado para webhook");
      return reply.status(200).send({ ok: true });
    }

    if (payment.status !== "pending") {
      return reply.status(200).send({ ok: true }); // Ya procesado — idempotente
    }

    if (transaction.status === "APPROVED") {
      await processApprovedPayment(
        transaction.reference,
        payment.plan ?? "",
        payment.courseId ?? undefined,
        payment.user.id,
        payment.amountCop
      );
    } else if (transaction.status === "DECLINED") {
      await prisma.paymentCop.update({
        where: { wompiRef: transaction.reference },
        data: { status: "declined" },
      });
    } else if (transaction.status === "VOIDED") {
      await prisma.paymentCop.update({
        where: { wompiRef: transaction.reference },
        data: { status: "voided" },
      });
    }

    return reply.status(200).send({ ok: true });
  });

  // ─── GET /api/payments/verify/:reference ─────────────────────────────────
  // EE-C05: si webhook no llegó en 60s → consultar Wompi manualmente
  fastify.get<{ Params: { reference: string } }>(
    "/verify/:reference",
    async (request, reply) => {
      const { reference } = request.params;

      const payment = await prisma.paymentCop.findUnique({
        where: { wompiRef: reference },
        include: { user: { select: { id: true, plan: true } } },
      });

      if (!payment) {
        return reply.status(404).send({ error: "Pago no encontrado" });
      }

      if (payment.status === "pending") {
        const wompiTx = await getTransactionByReference(reference);

        if (wompiTx?.status === "APPROVED") {
          await processApprovedPayment(
            reference,
            payment.plan ?? "",
            payment.courseId ?? undefined,
            payment.user.id,
            payment.amountCop
          );
          return reply.send({
            status: "APPROVED",
            plan: payment.plan,
            alreadyActive: false,
          });
        }

        if (wompiTx?.status === "DECLINED") {
          await prisma.paymentCop.update({
            where: { wompiRef: reference },
            data: { status: "declined" },
          });
          return reply.send({ status: "DECLINED", plan: payment.plan });
        }

        return reply.send({ status: "PENDING", plan: payment.plan });
      }

      return reply.send({
        status: payment.status.toUpperCase(),
        plan: payment.plan,
        paidAt: payment.paidAt,
      });
    }
  );
};