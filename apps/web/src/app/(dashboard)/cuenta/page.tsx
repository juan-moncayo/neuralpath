import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlanLabel, getPlanColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi Cuenta" };

export default async function CuentaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  const plans = [
    {
      id: "free",
      name: "Plan Gratis",
      features: ["2 sesiones MentorAI/mes", "1ª lección gratis por curso"],
      current: user.plan === "free",
    },
    {
      id: "premium",
      name: "Plan Premium",
      price: "$29.900/mes",
      features: ["Cursos ilimitados", "Sesiones MentorAI incluidas"],
      current: user.plan === "premium",
    },
    {
      id: "pro",
      name: "Plan Pro",
      price: "$59.900/mes",
      features: [
        "Cursos ilimitados",
        "10 sesiones MentorAI/mes",
        "Reportes al padre",
      ],
      current: user.plan === "pro",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-slate-900">👤 Mi Cuenta</h1>
        <p className="font-body text-slate-500 mt-1">
          Gestiona tu perfil y suscripción
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-display text-xl text-slate-900 mb-4">
          Información de la cuenta
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white font-display text-2xl shadow-md">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="font-body font-semibold text-slate-900 text-lg">
              {user.name}
            </p>
            <p className="font-body text-slate-500 text-sm">{user.email}</p>
            <span
              className={cn(
                "inline-block text-xs font-body font-semibold px-3 py-1 rounded-full mt-1",
                getPlanColor(user.plan)
              )}
            >
              {getPlanLabel(user.plan)}
            </span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-4">
          Planes disponibles
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "bg-white rounded-3xl p-6 shadow-sm border-2 transition-all",
                plan.current
                  ? "border-brand-400 shadow-brand-100"
                  : "border-gray-100 hover:border-brand-200"
              )}
            >
              {plan.current && (
                <span className="inline-block text-xs font-body font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full mb-3">
                  Plan actual ✓
                </span>
              )}
              <h3 className="font-display text-lg text-slate-900 mb-1">
                {plan.name}
              </h3>
              {plan.price && (
                <p className="font-display text-2xl text-brand-500 mb-3">
                  {plan.price}
                </p>
              )}
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-body text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <button
                  disabled
                  className="mt-4 w-full px-4 py-2.5 rounded-2xl bg-brand-500 text-white font-body font-semibold text-sm opacity-60 cursor-not-allowed"
                >
                  Próximamente 🚧
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
