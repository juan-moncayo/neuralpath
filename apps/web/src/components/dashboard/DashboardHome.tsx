"use client";

import Link from "next/link";
import { BookOpen, Bot, Star, Rocket } from "lucide-react";

interface Enrollment {
  id: string;
  progressPct: number;
  course: {
    title: string;
    thumbnailUrl: string | null;
  };
}

interface Props {
  userName: string;
  avatarEmoji: string;
  activeCoursesCount: number;
  sessionsLeft: number;
  maxSessions: number;
  plan: string;
  avgScore: number;
  recentEnrollments: Enrollment[];
}

export default function DashboardHome({
  userName,
  avatarEmoji,
  activeCoursesCount,
  sessionsLeft,
  maxSessions,
  plan,
  avgScore,
  recentEnrollments,
}: Props) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "¡Buenos días" : hour < 18 ? "¡Buenas tardes" : "¡Buenas noches";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Saludo */}
      <div className="bg-gradient-to-r from-brand-500 to-violet-500 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
            {avatarEmoji}
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl">
              {greeting}, {userName}!{" "}
              <span className="animate-wiggle inline-block">✨</span>
            </h1>
            <p className="font-body text-white/80 mt-1">
              ¿Listo para aprender algo genial hoy?
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cursos activos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-sm text-slate-500 mb-1">Cursos activos</p>
              <p className="font-display text-4xl text-slate-900">{activeCoursesCount}</p>
              <p className="font-body text-xs text-slate-400 mt-1">
                {activeCoursesCount === 0
                  ? "¡Inscríbete en uno!"
                  : "¡Sigue aprendiendo!"}
              </p>
            </div>
            <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-brand-500" />
            </div>
          </div>
        </div>

        {/* Sesiones MentorAI */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-sm text-slate-500 mb-1">Sesiones con Mentor</p>
              {plan === "premium" ? (
                <p className="font-display text-2xl text-slate-900">∞</p>
              ) : (
                <>
                  <p className="font-display text-4xl text-slate-900">{sessionsLeft}</p>
                  <p className="font-body text-xs text-slate-400 mt-1">
                    de {maxSessions} este mes
                  </p>
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-violet-500" />
            </div>
          </div>
        </div>

        {/* Score promedio */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-sm text-slate-500 mb-1">Score promedio</p>
              <p className="font-display text-4xl text-slate-900">
                {avgScore > 0 ? avgScore : "—"}
              </p>
              <p className="font-body text-xs text-slate-400 mt-1">
                {avgScore > 0 ? "¡Excelente trabajo!" : "Aún sin sesiones"}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Cursos en progreso */}
      {recentEnrollments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-slate-900">Continúa aprendiendo</h2>
            <Link
              href="/dashboard/cursos"
              className="text-sm font-body font-semibold text-brand-500 hover:text-brand-600"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="h-28 bg-gradient-to-br from-brand-300 to-violet-400 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white opacity-80" />
                </div>
                <div className="p-4">
                  <h3 className="font-body font-semibold text-slate-800 text-sm mb-3 line-clamp-2">
                    {enrollment.course.title}
                  </h3>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-body text-slate-500">Progreso</span>
                      <span className="text-xs font-body font-semibold text-brand-500">
                        {enrollment.progressPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-violet-400 rounded-full transition-all"
                        style={{ width: `${enrollment.progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentEnrollments.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="font-display text-xl text-slate-900 mb-2">
            ¡Tu aventura empieza hoy!
          </h3>
          <p className="font-body text-slate-500 mb-6">
            Explora los cursos disponibles y empieza a aprender
          </p>
          <Link
            href="/dashboard/cursos"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md"
          >
            <Rocket className="w-5 h-5" />
            Explorar cursos
          </Link>
        </div>
      )}
    </div>
  );
}
