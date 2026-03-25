import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Mi Progreso" };

export default function ProgresoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">📈 Mi Progreso</h1>
        <p className="font-body text-slate-500 mt-1">
          Mira cuánto has avanzado en tu aprendizaje
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Cursos completados", value: "0", emoji: "🏆" },
          { label: "Horas de estudio", value: "0h", emoji: "⏱️" },
          { label: "Sesiones con IA", value: "0", emoji: "🤖" },
        ].map(({ label, value, emoji }) => (
          <div
            key={label}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center"
          >
            <div className="text-3xl mb-2">{emoji}</div>
            <p className="font-display text-3xl text-slate-900">{value}</p>
            <p className="font-body text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
        <BarChart3 className="w-16 h-16 text-violet-200 mx-auto mb-4" />
        <h3 className="font-display text-xl text-slate-900 mb-2">
          ¡Aquí verás tu progreso!
        </h3>
        <p className="font-body text-slate-500">
          Completa lecciones y sesiones con tu mentor para ver tus estadísticas
        </p>
      </div>
    </div>
  );
}
