import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

interface PageProps {
  params: { code: string };
}

interface VerifyResponse {
  valid: boolean;
  certCode?: string;
  childName?: string;
  courseTitle?: string;
  completedAt?: string;
  error?: string;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Certificado ${params.code} — NeuralPath` };
}

async function verifyCertificate(code: string): Promise<VerifyResponse> {
  const apiUrl = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/api/certificates/verify/${code}`, {
      cache: "no-store",
    });
    return (await res.json()) as VerifyResponse;
  } catch {
    return { valid: false, error: "No se pudo verificar el certificado" };
  }
}

export default async function CertVerifyPage({ params }: PageProps) {
  const data = await verifyCertificate(params.code);

  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">🧠</span>
          <span className="font-display text-2xl text-brand-600">NeuralPath</span>
        </Link>

        {data.valid ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl text-slate-900 mb-2">
              ✅ Certificado Válido
            </h1>
            <p className="font-body text-slate-500 text-sm mb-6">
              Este certificado fue emitido por NeuralPath y es auténtico.
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 mb-6">
              <div>
                <p className="font-body text-xs text-slate-400 uppercase tracking-wide mb-1">Estudiante</p>
                <p className="font-body font-semibold text-slate-800">{data.childName}</p>
              </div>
              <div>
                <p className="font-body text-xs text-slate-400 uppercase tracking-wide mb-1">Curso completado</p>
                <p className="font-body font-semibold text-slate-800">{data.courseTitle}</p>
              </div>
              {dateStr && (
                <div>
                  <p className="font-body text-xs text-slate-400 uppercase tracking-wide mb-1">Fecha</p>
                  <p className="font-body font-semibold text-slate-800">{dateStr}</p>
                </div>
              )}
              <div>
                <p className="font-body text-xs text-slate-400 uppercase tracking-wide mb-1">Código</p>
                <p className="font-body text-sm font-mono text-brand-600">{data.certCode}</p>
              </div>
            </div>

            <p className="font-body text-xs text-slate-400">
              Emitido por NeuralPath Colombia 🇨🇴
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl text-slate-900 mb-2">
              Certificado no encontrado
            </h1>
            <p className="font-body text-slate-500 text-sm mb-6">
              {data.error ?? "Este código no corresponde a ningún certificado válido en NeuralPath."}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-colors"
            >
              Ir a NeuralPath
            </Link>
          </>
        )}
      </div>
    </div>
  );
}