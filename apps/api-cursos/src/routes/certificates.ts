/**
 * NEUR-79: Certificados PDF con QR (RF-C05)
 *   - jsPDF con nombre del niño, nombre del curso, fecha
 *   - Código neuralpath.co/cert/NP-XXXX verificable
 * NEUR-80: EE-C07 — fallo en generación → 3 reintentos automáticos
 *   → notificación al padre con link para regenerar manualmente
 */

import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { getUserFromHeaders } from "../middleware/plan-guard";

// ── Generador de código de certificado único ──────────────────────────────────
function generateCertCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I
  let code = "NP-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Notificación al padre cuando falla la generación (NEUR-80) ────────────────
async function notifyParentCertificateFailed(
  parentEmail: string,
  parentName: string,
  childName: string,
  courseTitle: string,
  enrollmentId: string
): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn("[cert] RESEND_API_KEY no configurada — notificación omitida");
    return;
  }

  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3002";
  const regenerateUrl = `${appUrl}/api/certificates/regenerate/${enrollmentId}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#1F3864">⚠️ Hola ${parentName}</h2>
      <p>Hubo un problema al generar el certificado de <strong>${childName}</strong>
         para el curso <strong>${courseTitle}</strong>.</p>
      <p>Puedes generarlo manualmente haciendo clic aquí:</p>
      <a href="${regenerateUrl}"
         style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;
                text-decoration:none;display:inline-block;margin:16px 0">
        Regenerar certificado 📄
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">NeuralPath 🇨🇴</p>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env["RESEND_FROM"] ?? "NeuralPath <no-reply@neuralpath.co>",
        to: parentEmail,
        subject: `⚠️ Problema al generar certificado de ${childName}`,
        html,
      }),
    });
  } catch (err) {
    console.error("[cert] Error enviando notificación al padre:", err);
  }
}

// ── Generación del PDF (lógica principal) ────────────────────────────────────
async function generateCertificatePdf(params: {
  childName: string;
  courseTitle: string;
  certCode: string;
  completedAt: Date;
  appUrl: string;
}): Promise<Buffer> {
  const { childName, courseTitle, certCode, completedAt, appUrl } = params;
  const verifyUrl = `${appUrl}/cert/${certCode}`;
  const dateStr = new Date(completedAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Importación dinámica de jsPDF (no disponible en SSR directo)
  const { jsPDF } = await import("jspdf").catch(() => {
    throw new Error("jsPDF no disponible en este entorno");
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  // Fondo degradado simulado con rectángulos
  doc.setFillColor(249, 115, 22); // brand-500
  doc.rect(0, 0, W, 18, "F");
  doc.setFillColor(139, 92, 246); // violet-500
  doc.rect(0, H - 18, W, 18, "F");

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("Certificado de Logro", W / 2, 50, { align: "center" });

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("NeuralPath — Aprende con IA 🇨🇴", W / 2, 62, { align: "center" });

  // Nombre del niño
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30, 41, 59);
  doc.text(childName, W / 2, 90, { align: "center" });

  // Texto descriptivo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);
  doc.text("ha completado satisfactoriamente el curso", W / 2, 102, { align: "center" });

  // Nombre del curso
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22); // brand-500
  doc.text(courseTitle, W / 2, 116, { align: "center" });

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha de finalización: ${dateStr}`, W / 2, 132, { align: "center" });

  // Código de certificado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Código: ${certCode}`, W / 2, 144, { align: "center" });

  // URL de verificación
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(139, 92, 246);
  doc.text(`Verificar en: ${verifyUrl}`, W / 2, 153, { align: "center" });

  // QR Code (usando qrcode-generator inline para no depender de canvas)
  // Lo generamos como SVG y lo embebemos como texto
  try {
    const QRCode = await import("qrcode").catch(() => null);
    if (QRCode) {
      const qrDataUrl = await QRCode.default.toDataURL(verifyUrl, {
        width: 128,
        margin: 1,
        color: { dark: "#1e293b", light: "#ffffff" },
      });
      // Posicionar QR en esquina inferior derecha
      doc.addImage(qrDataUrl, "PNG", W - 52, H - 55, 38, 38);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Escanear para", W - 33, H - 14, { align: "center" });
      doc.text("verificar", W - 33, H - 10, { align: "center" });
    }
  } catch {
    // QR opcional — el código textual ya permite verificar
  }

  // Línea decorativa
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1);
  doc.line(40, 70, W - 40, 70);

  return Buffer.from(doc.output("arraybuffer"));
}

// ── Route plugin ──────────────────────────────────────────────────────────────
export const certificatesRoutes: FastifyPluginAsync = async (fastify) => {
  const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3002";

  /**
   * GET /api/certificates/:enrollmentId
   * Genera o retorna el certificado PDF del niño para un curso completado.
   * NEUR-80: 3 reintentos automáticos ante fallo.
   */
  fastify.get<{ Params: { enrollmentId: string } }>(
    "/:enrollmentId",
    async (request, reply) => {
      const user = getUserFromHeaders(request);
      if (!user) {
        return reply.status(401).send({ error: "No autorizado" });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: request.params.enrollmentId },
        include: {
          child: {
            select: {
              name: true,
              parentId: true,
              parent: { select: { email: true, name: true } },
            },
          },
          course: { select: { title: true } },
        },
      });

      if (!enrollment) {
        return reply.status(404).send({ error: "Inscripción no encontrada" });
      }

      // Verificar que el padre es el dueño (o admin)
      if (
        user.role === "parent" &&
        enrollment.child.parentId !== user.userId
      ) {
        return reply.status(403).send({ error: "No autorizado" });
      }

      if (!enrollment.completedAt) {
        return reply.status(400).send({
          error: "El niño aún no ha completado este curso",
          code: "NOT_COMPLETED",
        });
      }

      // Si ya existe URL de certificado, redirigir
      if (enrollment.certificateUrl) {
        return reply.redirect(enrollment.certificateUrl);
      }

      // Generar código único
      const certCode = generateCertCode();
      let pdfBuffer: Buffer | null = null;
      let lastError: unknown = null;

      // NEUR-80: 3 reintentos automáticos
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          pdfBuffer = await generateCertificatePdf({
            childName: enrollment.child.name,
            courseTitle: enrollment.course.title,
            certCode,
            completedAt: enrollment.completedAt,
            appUrl: APP_URL,
          });
          lastError = null;
          break; // éxito
        } catch (err) {
          lastError = err;
          fastify.log.warn(
            { attempt, enrollmentId: enrollment.id, err },
            `[cert] Intento ${attempt}/3 falló`
          );
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }

      // NEUR-80: si falló tras 3 intentos → notificar al padre
      if (!pdfBuffer) {
        fastify.log.error(
          { enrollmentId: enrollment.id, lastError },
          "[cert] Falló generación tras 3 intentos"
        );

        void notifyParentCertificateFailed(
          enrollment.child.parent.email,
          enrollment.child.parent.name,
          enrollment.child.name,
          enrollment.course.title,
          enrollment.id
        );

        return reply.status(503).send({
          error: "No pudimos generar el certificado ahora. Te notificaremos por email.",
          code: "CERTIFICATE_GENERATION_FAILED",
        });
      }

      // Guardar certCode en enrollment (usamos certificateUrl como código por ahora)
      const certUrl = `${APP_URL}/cert/${certCode}`;
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { certificateUrl: certUrl },
      });

      fastify.log.info(
        { enrollmentId: enrollment.id, certCode },
        "[cert] Certificado generado ✅"
      );

      // Devolver PDF directamente
      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `attachment; filename="certificado-${certCode}.pdf"`
        )
        .send(pdfBuffer);
    }
  );

  /**
   * GET /api/certificates/regenerate/:enrollmentId
   * NEUR-80: link enviado al padre para regenerar manualmente.
   */
  fastify.get<{ Params: { enrollmentId: string } }>(
    "/regenerate/:enrollmentId",
    async (request, reply) => {
      // Limpiar el certificateUrl previo para forzar regeneración
      await prisma.enrollment.update({
        where: { id: request.params.enrollmentId },
        data: { certificateUrl: null },
      });
      // Redirigir al endpoint de generación
      return reply.redirect(`/api/certificates/${request.params.enrollmentId}`);
    }
  );

  /**
   * GET /api/certificates/verify/:certCode
   * Verifica si un código de certificado es válido.
   */
  fastify.get<{ Params: { certCode: string } }>(
    "/verify/:certCode",
    async (request, reply) => {
      const { certCode } = request.params;
      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3002";
      const expectedUrl = `${appUrl}/cert/${certCode}`;

      const enrollment = await prisma.enrollment.findFirst({
        where: { certificateUrl: expectedUrl },
        include: {
          child: { select: { name: true } },
          course: { select: { title: true } },
        },
      });

      if (!enrollment) {
        return reply.status(404).send({
          valid: false,
          error: "Certificado no encontrado",
        });
      }

      return reply.send({
        valid: true,
        certCode,
        childName: enrollment.child.name,
        courseTitle: enrollment.course.title,
        completedAt: enrollment.completedAt,
      });
    }
  );
};