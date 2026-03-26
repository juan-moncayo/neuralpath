import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getPlanLabel, getPlanColor, cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const metadata: Metadata = { title: "Mi Plan — NeuralPath" };

const PLANS = [
  {
    id: "free",
    name: "Plan Gratis",
    price: null,
    priceLabel: "$0",
    features: ["2 sesiones MentorAI/mes", "1ª lección gratis por curso"],
  },
  {
    id: "premium",
    name: "Plan Premium",
    price: 29900,
    priceLabel: "$29.900/mes",
    features: ["Cursos ilimitados", "Sesiones MentorAI incluidas"],
  },
  {
    id: "pro",
    name: "Plan Pro",
    price: 59900,
    priceLabel: "$59.900/mes",
    features: [
      "Todo lo de Premium",
      "10 sesiones MentorAI/mes",
      "Reportes de progreso al padre",
    ],
  },
];

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const subscription = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  const currentPlan = session.user.plan;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-slate-900">🚀 Mi Plan</h1>
        <p className="font-body text-slate-500 mt-1">
          Gestiona tu suscripción
        </p>
      </div>

      {/* Plan activo */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-display text-xl text-slate-900 mb-4">Plan activo</h2>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "text-sm font-body font-bold px-4 py-2 rounded-full",
              getPlanColor(currentPlan)
            )}
          >
            {getPlanLabel(currentPlan)}
          </span>
          {subscription?.periodEnd && (
            <p className="font-body text-sm text-slate-500">
              Vence:{" "}
              <strong>
                {new Date(subscription.periodEnd).toLocaleDateString("es-CO", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </strong>
            </p>
          )}
        </div>
      </div>

      {/* Comparativa de planes */}
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-4">
          Planes disponibles
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-white rounded-3xl p-6 shadow-sm border-2 transition-all",
                  isCurrent
                    ? "border-brand-400 shadow-brand-100/50"
                    : "border-gray-100 hover:border-brand-200"
                )}
              >
                {isCurrent && (
                  <span className="inline-block text-xs font-body font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full mb-3">
                    Plan actual ✓
                  </span>
                )}
                <h3 className="font-display text-lg text-slate-900 mb-1">
                  {plan.name}
                </h3>
                <p className="font-display text-2xl text-brand-600 mb-4">
                  {plan.priceLabel}
                </p>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-body text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.price && (
                  <Link
                    href="/planes"
                    className="block w-full text-center px-4 py-2.5 rounded-2xl bg-brand-500 text-white font-body font-semibold text-sm hover:bg-brand-600 transition-colors"
                  >
                    Cambiar a {plan.name}
                  </Link>
                )}
                {!isCurrent && !plan.price && (
                  <p className="text-xs font-body text-slate-400 text-center">
                    Plan gratuito por defecto
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
