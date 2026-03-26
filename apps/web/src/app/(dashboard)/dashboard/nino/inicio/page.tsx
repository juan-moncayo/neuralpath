import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getActiveChildId } from "@/lib/active-child";

export const metadata: Metadata = { title: "Inicio — NeuralPath" };

const PLAN_SESSIONS: Record<string, number> = { free: 2, premium: 0, pro: 10 };

export default async function NinoInicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const childId = getActiveChildId();
  if (!childId) redirect("/dashboard/padre");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, parentId: session.user.id },
    include: {
      enrollments: {
        where: { completedAt: null },
        include: {
          course: {
            select: { id: true, title: true, category: true, thumbnailUrl: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 2,
      },
      sessions: {
        where: { createdAt: { gte: startOfMonth }, status: "completed" },
        select: { scoreTotal: true },
      },
    },
  });

  if (!child) redirect("/dashboard/padre");

  const maxSessions = PLAN_SESSIONS[session.user.plan] ?? 2;
  const sessionsUsed = child.sessions.length;
  const sessionsLeft = Math.max(0, maxSessions - sessionsUsed);
  const avgScore =
    child.sessions.length > 0
      ? Math.round(
          child.sessions.reduce((acc, s) => acc + s.scoreTotal, 0) /
            child.sessions.length
        )
      : 0;

  const categoryEmojis: Record<string, string> = {
    Matemáticas: "🔢", Ciencias: "🔬", Inglés: "🌍",
    Lenguaje: "📖", Historia: "🏛️", Arte: "🎨",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          ¡Hola, {child.name}! ¿Qué vamos a aprender hoy? 🚀
        </h1>
        <p className="font-body text-slate-500 mt-1">
          Sigue con tu aventura de aprendizaje
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="text-3xl mb-1">📚</div>
          <p className="font-display text-3xl text-slate-900">
            {child.enrollments.length}
          </p>
          <p className="font-body text-xs text-slate-500 mt-1">Cursos activos</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="text-3xl mb-1">🤖</div>
          <p className="font-display text-3xl text-slate-900">{sessionsLeft}</p>
          <p className="font-body text-xs text-slate-500 mt-1">
            {maxSessions === 0 ? "Sesiones con plan" : `Sesiones disponibles`}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="text-3xl mb-1">⭐</div>
          <p className="font-display text-3xl text-slate-900">{avgScore}</p>
          <p className="font-body text-xs text-slate-500 mt-1">Score promedio</p>
        </div>
      </div>

      {/* Últimos cursos */}
      {child.enrollments.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-slate-900">
              Continúa aprendiendo 🎓
            </h2>
            <Link
              href="/dashboard/nino/cursos"
              className="font-body text-sm text-brand-500 hover:text-brand-600 font-semibold"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {child.enrollments.map(({ course, id }) => (
              <Link
                key={id}
                href={`/cursos/${course.id}`}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-3xl flex-shrink-0">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    categoryEmojis[course.category] ?? "📚"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body font-semibold text-slate-800 text-sm line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="font-body text-xs text-brand-500 mt-0.5">
                    {course.category}
                  </p>
                </div>
                <span className="text-brand-400 text-lg flex-shrink-0">▶️</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-3">📚</div>
          <h3 className="font-display text-xl text-slate-900 mb-2">
            ¡Explora el catálogo!
          </h3>
          <p className="font-body text-slate-500 mb-5">
            Descubre cursos increíbles para aprender.
          </p>
          <Link
            href="/cursos"
            className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
          >
            Ver catálogo
          </Link>
        </div>
      )}

      {/* Botón mentor */}
      <div className="bg-gradient-to-r from-brand-500 to-violet-600 rounded-3xl p-6 text-white text-center">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="font-display text-xl mb-1">¿Tienes dudas?</h3>
        <p className="font-body text-white/80 text-sm mb-4">
          Practica con tu mentor IA favorito
        </p>
        <Link
          href="/dashboard/nino/mentores"
          className="inline-block px-6 py-3 rounded-2xl bg-white text-brand-600 font-body font-semibold text-sm hover:shadow-md transition-all"
        >
          Practicar con mentor →
        </Link>
      </div>
    </div>
  );
}
