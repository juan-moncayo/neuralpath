/**
 * NEUR-47: Email de confirmación de pago al padre (RF-C10)
 * - Detalle del plan, vigencia y link a factura (Resend)
 * - 3 reintentos con back-off exponencial (EE-M07 aplicado a pagos)
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = process.env["RESEND_FROM"] ?? "NeuralPath <no-reply@neuralpath.co>";
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3002";

export interface PaymentConfirmationData {
  parentEmail: string;
  parentName: string;
  plan: string;
  amountCop: number;
  wompiRef: string;
  periodStart: Date;
  periodEnd: Date;
}

function formatCop(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    premium: "Plan Premium",
    pro: "Plan Pro",
    free: "Plan Gratis",
  };
  return labels[plan] ?? plan;
}

function buildPaymentEmailHtml(data: PaymentConfirmationData): string {
  const planLabel = getPlanLabel(data.plan);
  const amount = formatCop(data.amountCop);
  const start = formatDate(data.periodStart);
  const end = formatDate(data.periodEnd);
  const dashboardUrl = `${APP_URL}/dashboard/padre/pagos`;

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#f97316,#8b5cf6);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
        <p style="font-size:48px;margin:0">🎉</p>
        <h1 style="color:#ffffff;font-size:26px;margin:12px 0 4px">¡Pago exitoso!</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0">
          Hola <strong>${data.parentName}</strong>, tu suscripción está activa.
        </p>
      </div>

      <!-- Detalle del plan -->
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px">
        <h2 style="color:#1e293b;font-size:16px;margin:0 0 16px">📋 Detalle de tu compra</h2>

        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px">Plan</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:700;text-align:right">${planLabel}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b;font-size:14px">Monto pagado</td>
            <td style="padding:8px 0;color:#f97316;font-size:14px;font-weight:700;text-align:right">${amount} COP</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b;font-size:14px">Vigencia</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;text-align:right">${start} – ${end}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:8px 0;color:#64748b;font-size:14px">Referencia Wompi</td>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-family:monospace;text-align:right">${data.wompiRef}</td>
          </tr>
        </table>
      </div>

      <!-- Beneficios según plan -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:20px">
        <h3 style="color:#166534;font-size:14px;margin:0 0 10px">✅ ¿Qué incluye tu ${planLabel}?</h3>
        ${data.plan === "pro" ? `
          <p style="color:#166534;font-size:13px;margin:4px 0">• 10 sesiones con MentorAI por mes</p>
          <p style="color:#166534;font-size:13px;margin:4px 0">• Cursos ilimitados</p>
          <p style="color:#166534;font-size:13px;margin:4px 0">• Reportes de progreso automáticos</p>
          <p style="color:#166534;font-size:13px;margin:4px 0">• Certificados PDF con QR verificable</p>
        ` : `
          <p style="color:#166534;font-size:13px;margin:4px 0">• Cursos ilimitados</p>
          <p style="color:#166534;font-size:13px;margin:4px 0">• Progreso guardado para todos tus hijos</p>
          <p style="color:#166534;font-size:13px;margin:4px 0">• Soporte por email prioritario</p>
        `}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px">
        <a href="${dashboardUrl}"
           style="background:linear-gradient(135deg,#f97316,#8b5cf6);color:#ffffff;padding:14px 32px;
                  border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
          Ver mis pagos →
        </a>
      </div>

      <!-- Footer -->
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
        NeuralPath — Aprende con IA 🇨🇴 · <a href="${APP_URL}" style="color:#f97316">neuralpath.co</a>
      </p>
      <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:8px 0 0">
        Si no realizaste este pago, contáctanos respondiendo este correo.
      </p>
    </div>
  `;
}

/**
 * Envía email de confirmación de pago con 3 reintentos back-off exponencial.
 * Si Resend no está configurado, loguea y continúa sin romper el flujo.
 */
export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationData
): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    // RESEND_API_KEY no configurada — loguear sin romper el flujo de pago
    console.info("[email] RESEND_API_KEY no configurada — email omitido:", data.parentEmail);
    return;
  }

  const html = buildPaymentEmailHtml(data);
  const subject = `✅ Pago confirmado — ${getPlanLabel(data.plan)} NeuralPath`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: data.parentEmail,
          subject,
          html,
        }),
      });

      if (res.ok) {
        console.info(`[email] Confirmación de pago enviada a ${data.parentEmail}`);
        return;
      }

      const errBody = (await res.json()) as { message?: string };
      console.warn(`[email] intento ${attempt + 1}/3 falló:`, errBody.message);
    } catch (err) {
      console.warn(`[email] intento ${attempt + 1}/3 error de red:`, err);
    }

    // Back-off exponencial: 1s, 2s, 4s
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  console.error(`[email] Falló tras 3 intentos — email no enviado a ${data.parentEmail}`);
}