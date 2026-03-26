"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3002";

interface Plan {
  id: "free" | "premium" | "pro";
  name: string;
  price: number | null;
  priceLabel: string;
  description: string;
  features: string[];
  color: string;
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Plan Gratis",
    price: null,
    priceLabel: "$0",
    description: "Para empezar a explorar",
    features: [
      "2 sesiones con MentorAI por mes",
      "Primera lección gratis por curso",
      "Acceso al catálogo de cursos",
    ],
    color: "border-gray-200",
    highlighted: false,
  },
  {
    id: "premium",
    name: "Plan Premium",
    price: 29900,
    priceLabel: "$29.900",
    description: "Para aprender sin límites",
    features: [
      "Cursos ilimitados",
      "Sesiones MentorAI incluidas",
      "Progreso guardado",
      "Soporte por email",
    ],
    color: "border-brand-300",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Plan Pro",
    price: 59900,
    priceLabel: "$59.900",
    description: "La mejor experiencia de aprendizaje",
    features: [
      "Todo lo de Premium",
      "10 sesiones MentorAI/mes",
      "Reportes de progreso al padre",
      "Prioridad en soporte",
      "Próximamente: avatares exclusivos",
    ],
    color: "border-violet-400",
    highlighted: true,
  },
];

export default function PlanesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (planId: "premium" | "pro") => {
    setLoading(planId);
    setError(null);

    try {
      const userId = localStorage.getItem("userId") ?? "";
      const userEmail = localStorage.getItem("userEmail") ?? "usuario@neuralpath.co";
      const userPlan = localStorage.getItem("userPlan") ?? "free";
      const userRole = localStorage.getItem("userRole") ?? "parent";

      if (!userId) {
        window.location.href = "/login?redirect=/planes";
        return;
      }

      const res = await fetch(`${API_URL}/api/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-user-role": userRole,
          "x-user-plan": userPlan,
        },
        body: JSON.stringify({
          plan: planId,
          customerEmail: userEmail,
          redirectUrl: `${APP_URL}/checkout/resultado`,
        }),
      });

      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (data.code === "PLAN_ALREADY_ACTIVE") {
          setError("Ya tienes este plan activo. ¡A aprender! 🚀");
        } else {
          setError(data.error ?? "Error al generar el pago");
        }
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-500 to-violet-600 text-white py-14 px-4 text-center">
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          🚀 Planes NeuralPath
        </h1>
        <p className="font-body text-lg text-white/80 max-w-xl mx-auto">
          Invierte en el aprendizaje de tu hijo. Cancela cuando quieras.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 font-body text-sm px-5 py-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-7 shadow-sm border-2 transition-all relative ${
                plan.highlighted
                  ? "border-violet-400 shadow-violet-100 shadow-lg"
                  : plan.color
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-brand-500 to-violet-500 text-white text-xs font-body font-bold px-4 py-1.5 rounded-full shadow-md">
                    ⭐ Más popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="font-display text-xl text-slate-900 mb-1">
                  {plan.name}
                </h2>
                <p className="font-body text-sm text-slate-500 mb-4">
                  {plan.description}
                </p>
                <div>
                  <span className="font-display text-4xl text-slate-900">
                    {plan.priceLabel}
                  </span>
                  {plan.price && (
                    <span className="font-body text-slate-400 text-sm ml-1">COP/mes</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 font-body text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-5 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
                >
                  Continuar gratis
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => void handleCheckout(plan.id as "premium" | "pro")}
                    disabled={loading !== null}
                    className={`w-full px-5 py-3 rounded-2xl font-body font-semibold transition-all ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white hover:shadow-md disabled:opacity-60"
                        : "bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
                    }`}
                  >
                    {loading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirigiendo...
                      </span>
                    ) : (
                      `Elegir ${plan.name}`
                    )}
                  </button>
                  <p className="text-center font-body text-xs text-slate-400 mt-2">
                    Retracto: 5 días hábiles
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="font-body text-sm text-slate-400">
            Pagos seguros vía{" "}
            <span className="font-semibold text-slate-600">Wompi</span> 🇨🇴 ·
            Pesos colombianos (COP) · Cancela cuando quieras
          </p>
          <div className="flex justify-center gap-6 mt-3 text-sm font-body text-slate-400">
            <span>💳 Tarjeta</span>
            <span>🏦 PSE</span>
            <span>📱 Nequi</span>
            <span>📱 Daviplata</span>
          </div>
        </div>
      </div>
    </div>
  );
}
