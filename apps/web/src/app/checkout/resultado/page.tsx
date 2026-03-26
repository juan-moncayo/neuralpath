"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";

type PaymentStatus = "APPROVED" | "DECLINED" | "PENDING" | "loading";

interface VerifyResponse {
  status: string;
  plan?: string;
  alreadyActive?: boolean;
  paidAt?: string;
}

const DECLINED_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Fondos insuficientes — intenta con otro método de pago.",
  CARD_BLOCKED: "Tarjeta bloqueada — contacta tu banco.",
  PAYMENT_ERROR: "Error en el pago — intenta de nuevo.",
  default: "El pago fue rechazado — intenta con otro método.",
};

export default function CheckoutResultadoPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("id") ?? searchParams.get("reference") ?? "";

  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [plan, setPlan] = useState<string | null>(null);
  const [alreadyActive, setAlreadyActive] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [errorCode, setErrorCode] = useState<string>("default");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verify = useCallback(async (): Promise<boolean> => {
    if (!reference) {
      setStatus("DECLINED");
      return true;
    }

    try {
      const res = await fetch(`${API_URL}/api/payments/verify/${encodeURIComponent(reference)}`);
      if (!res.ok) {
        setStatus("DECLINED");
        return true;
      }

      const data = (await res.json()) as VerifyResponse;
      const s = data.status as PaymentStatus;

      if (s === "APPROVED") {
        setStatus("APPROVED");
        setPlan(data.plan ?? null);
        setAlreadyActive(data.alreadyActive ?? false);
        return true;
      }

      if (s === "DECLINED") {
        setStatus("DECLINED");
        return true;
      }

      setStatus("PENDING");
      return false;
    } catch {
      setStatus("PENDING");
      return false;
    }
  }, [reference]);

  useEffect(() => {
    void verify();
  }, [verify]);

  // Polling cada 30s máximo 5 veces si sigue PENDING
  useEffect(() => {
    if (status !== "PENDING") return;
    if (pollCount >= 5) return;

    const interval = setInterval(async () => {
      setPollCount((c) => c + 1);
      const done = await verify();
      if (done && pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 30_000);

    pollingRef.current = interval;
    return () => clearInterval(interval);
  }, [status, pollCount, verify]);

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="font-body text-slate-600 text-lg">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  // APPROVED
  if (status === "APPROVED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-md w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="font-display text-3xl text-slate-900 mb-2">
            {alreadyActive ? "Ya tienes este plan activo" : "¡Pago exitoso! 🎉"}
          </h1>
          <p className="font-body text-slate-500 mb-6">
            {alreadyActive
              ? "Ya tienes este plan activo. ¡A aprender! 🚀"
              : `Ya tienes acceso a tu ${plan ? `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}` : "plan"}. ¡Es hora de aprender! 🚀`}
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard/cursos"
              className="block w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
            >
              📚 Ver mis cursos
            </Link>
            <Link
              href="/cursos"
              className="block w-full px-6 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
            >
              Explorar catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PENDING (máximo de polls alcanzado)
  if (status === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-md w-full">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-slate-900 mb-2">
            Verificando pago...
          </h1>
          <p className="font-body text-slate-500 mb-6">
            {pollCount >= 5
              ? "Tarda un poco más de lo esperado. Revisa tu correo — te notificaremos cuando se confirme."
              : "Tu pago está siendo procesado. Esto puede tomar unos segundos..."}
          </p>
          {pollCount < 5 && (
            <div className="flex justify-center mb-6">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          )}
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    );
  }

  // DECLINED
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-md w-full">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl text-slate-900 mb-2">
          Pago rechazado
        </h1>
        <p className="font-body text-slate-500 mb-6">
          {DECLINED_MESSAGES[errorCode] ?? DECLINED_MESSAGES["default"]}
        </p>
        <div className="space-y-3">
          <Link
            href="/planes"
            className="block w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
          >
            🔄 Intentar de nuevo
          </Link>
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
