import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getActiveChildId } from "@/lib/active-child";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Mi Progreso — NeuralPath" };

export default async function NinoProgresoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const childId = getActiveChildId();
  if (!childId) redirect("/dashboard/padre");

  const [completedEnrollments, sessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { childId, completedAt: { not: null } },
      include: {
        course: {
          select: { id: true, title: true, category: true },
        },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.mentorSession.findMany({
      where: { childId },
      include: {
        mentor: { select: { name: true, emoji: true, specialty: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);

  const totalHours = Math.round(
    sessions.reduce((acc, s) => acc + s.durationSecs, 0) / 3600
  );
  const avgScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((acc, s) => acc + s.scoreTotal, 0) / sessions.length
        )
      : 0;

  // Logros basados en completedAt de cursos
  const achievements: { emoji: string; title: string; desc: string }[] = [];
  if (completedEnrollments.length >= 1)
    achievements.push({ emoji: "🏆", title: "Primer Logro", desc: "¡Completaste tu primer curso!" });
  if (completedEnrollments.length >= 3)
    achievements.push({ emoji: "⭐", title: "Súper Estudiante", desc: "¡Completaste 3 cursos!" });
  if (sessions.length >= 5)
    achievements.push({ emoji: "🤖", title: "Amigo del Mentor", desc: "¡Tuviste 5 sesiones con IA!" });
  if (totalHours >= 5)
    achievements.push({ emoji: "⏰", title: "Estudiante Dedicado", desc: "¡5 horas de aprendizaje!" });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">📈 Mi Progreso</h1>
        <p className="font-body text-slate-500 mt-1">
          Mira todo lo que has aprendido
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: "🏆", value: completedEnrollments.length.toString(), label: "Cursos completados" },
          { emoji: "⏱️", value: `${totalHours}h`, label: "Horas de estudio" },
          { emoji: "🤖", value: sessions.length.toString(), label: "Sesiones con IA" },
        ].map(({ emoji, value, label }) => (
          <div
            key={label}
            className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center"
          >
            <div className="text-3xl mb-2">{emoji}</div>
            <p className="font-display text-3xl text-slate-900">{value}</p>
            <p className="font-body text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Logros */}
      {achievements.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-slate-900 mb-3">
            🎖️ Logros desbloqueados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div
                key={a.title}
                className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 text-center"
              >
                <div className="text-4xl mb-2">{a.emoji}</div>
                <p className="font-body text-sm font-semibold text-slate-800 mb-1">{a.title}</p>
                <p className="font-body text-xs text-slate-500">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cursos completados */}
      {completedEnrollments.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-slate-900 mb-3">
            ✅ Cursos completados
          </h2>
          <div className="space-y-3">
            {completedEnrollments.map(({ id, course, completedAt }) => (
              <div
                key={id}
                className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <span className="text-2xl flex-shrink-0">
                  {course.category === "Matemáticas" ? "🔢" :
                   course.category === "Ciencias" ? "🔬" :
                   course.category === "Inglés" ? "🌍" : "📚"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-slate-800 text-sm truncate">
                    {course.title}
                  </p>
                  {completedAt && (
                    <p className="font-body text-xs text-slate-400 mt-0.5">
                      Completado el{" "}
                      {new Date(completedAt).toLocaleDateString("es-CO", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="text-emerald-500 flex-shrink-0 text-lg">✅</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      {sessions.length > 0 ? (
        <div>
          <h2 className="font-display text-xl text-slate-900 mb-3">
            🤖 Historial de sesiones
          </h2>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="hidden sm:grid grid-cols-4 px-5 py-3 border-b border-gray-100 text-xs font-body font-semibold text-slate-400 uppercase tracking-wide">
              <span>Mentor</span>
              <span>Fecha</span>
              <span>Duración</span>
              <span>Score</span>
            </div>
            <div className="divide-y divide-gray-50">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3.5 items-center"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.mentor.emoji}</span>
                    <span className="font-body text-sm text-slate-700 font-semibold">
                      {s.mentor.name}
                    </span>
                  </div>
                  <p className="font-body text-sm text-slate-500">
                    {new Date(s.startedAt).toLocaleDateString("es-CO", {
                      day: "numeric", month: "short",
                    })}
                  </p>
                  <p className="font-body text-sm text-slate-500">
                    {Math.round(s.durationSecs / 60)} min
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="font-display text-brand-600 text-sm font-bold">
                      {s.scoreTotal}
                    </span>
                    <span className="font-body text-xs text-slate-400">pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <BarChart3 className="w-16 h-16 text-violet-200 mx-auto mb-4" />
          <h3 className="font-display text-xl text-slate-900 mb-2">
            ¡Aquí verás tu progreso!
          </h3>
          <p className="font-body text-slate-500">
            Completa lecciones y sesiones con tu mentor para ver tus estadísticas.
          </p>
        </div>
      )}
    </div>
  );
}
