import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Mis Cursos" };

export default async function CursosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const child = await prisma.childProfile.findFirst({
    where: { parentId: session.user.id },
    include: {
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              thumbnailUrl: true,
              ageMin: true,
              ageMax: true,
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const enrollments = child?.enrollments ?? [];

  const categoryEmojis: Record<string, string> = {
    Matemáticas: "🔢",
    Ciencias: "🔬",
    Inglés: "🌍",
    Lenguaje: "📖",
    Historia: "🏛️",
    Arte: "🎨",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-slate-900">📚 Mis Cursos</h1>
          <p className="font-body text-slate-500 mt-1">
            {enrollments.length > 0
              ? `${enrollments.length} curso${enrollments.length !== 1 ? "s" : ""} en progreso`
              : "Todos tus cursos en un solo lugar"}
          </p>
        </div>
        <Link
          href="/cursos"
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold text-sm hover:shadow-md transition-all"
        >
          + Explorar cursos
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
          <h3 className="font-display text-xl text-slate-900 mb-2">
            Aún no tienes cursos
          </h3>
          <p className="font-body text-slate-500 mb-6">
            ¡Explora el catálogo y comienza a aprender! 🚀
          </p>
          <Link
            href="/cursos"
            className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
          >
            Ver catálogo de cursos
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {enrollments.map((enrollment) => {
            const { course, progressPct, completedAt, id } = enrollment;
            const emoji = categoryEmojis[course.category] ?? "📚";

            return (
              <div
                key={id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                {/* Thumbnail */}
                <div className="h-28 bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-5xl relative">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    emoji
                  )}
                  {completedAt && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <span className="bg-emerald-500 text-white text-xs font-body font-bold px-3 py-1 rounded-full">
                        ✅ Completado
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <span className="text-xs font-body font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                    {course.category}
                  </span>
                  <h3 className="font-display text-lg text-slate-900 mt-2 mb-1 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="font-body text-xs text-slate-400 mb-3">
                    {course._count.lessons} lecciones · {course.ageMin}–{course.ageMax} años
                  </p>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-body text-slate-500 mb-1">
                      <span>Progreso</span>
                      <span className="font-semibold">{progressPct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-violet-500 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/cursos/${course.id}`}
                    className="block w-full text-center px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold text-sm hover:shadow-md transition-all"
                  >
                    {progressPct === 0
                      ? "▶️ Comenzar"
                      : completedAt
                      ? "🔄 Repasar"
                      : "▶️ Continuar"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
