import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Lock, BookOpen, Clock, Users, ChevronRight } from "lucide-react";
import { formatCop } from "@/lib/utils";
import { prisma } from "@neuralpath/database";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await getCourse(params.id);
  return {
    title: course ? `${course.title} — NeuralPath` : "Curso no encontrado",
  };
}

async function getCourse(id: string) {
  const course = await prisma.course.findUnique({
    where: { id, isPublished: true },
    include: {
      instructor: { select: { name: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, durationSecs: true, order: true, isFree: true },
      },
      _count: { select: { enrollments: true } },
    },
  });
  return course;
}

function formatDuration(secs: number): string {
  if (secs === 0) return "—";
  const m = Math.floor(secs / 60);
  return `${m} min`;
}

export default async function CursoDetailPage({ params }: PageProps) {
  const [course, session] = await Promise.all([
    getCourse(params.id),
    auth(),
  ]);

  if (!course) notFound();

  const userPlan = session?.user?.plan ?? "free";
  const isParent = session?.user?.role === "parent" || session?.user?.role === "admin";

  // Verificar si el usuario (padre) ya tiene inscripción para algún niño
  let isEnrolled = false;
  if (session?.user?.id && !isParent) {
    // Para niños directamente
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id },
    });
    isEnrolled = !!enrollment;
  }

  const firstFreeLesson = course.lessons.find((l) => l.isFree);
  const hasAccess = userPlan === "premium" || userPlan === "pro" || isEnrolled;

  const categoryEmojis: Record<string, string> = {
    Matemáticas: "🔢", Ciencias: "🔬", Inglés: "🌍",
    Lenguaje: "📖", Historia: "🏛️", Arte: "🎨",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Header del curso */}
      <div className="bg-gradient-to-r from-brand-500 to-violet-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm font-body mb-4 transition-colors"
          >
            ← Volver al catálogo
          </Link>

          <div className="flex items-start gap-4">
            <div className="text-6xl hidden sm:block">
              {categoryEmojis[course.category] ?? "📚"}
            </div>
            <div className="flex-1">
              <span className="text-xs font-body font-semibold bg-white/20 px-3 py-1 rounded-full">
                {course.category}
              </span>
              <h1 className="font-display text-3xl md:text-4xl mt-3 mb-2">
                {course.title}
              </h1>
              <p className="font-body text-white/80 text-base mb-4 max-w-2xl">
                {course.description}
              </p>
              <div className="flex flex-wrap gap-4 text-sm font-body text-white/70">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {course.instructor.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {course.lessons.length} lecciones
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Para {course.ageMin}–{course.ageMax} años
                </span>
                <span className="flex items-center gap-1.5">
                  👥 {course._count.enrollments} estudiantes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        {/* Lista de lecciones */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display text-2xl text-slate-900">
            📋 Contenido del curso
          </h2>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {course.lessons.map((lesson, idx) => {
              const canWatch = lesson.isFree || hasAccess;

              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0"
                >
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-display text-sm flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-slate-800 truncate">
                      {lesson.title}
                    </p>
                    {lesson.durationSecs > 0 && (
                      <p className="font-body text-xs text-slate-400 mt-0.5">
                        {formatDuration(lesson.durationSecs)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lesson.isFree && (
                      <span className="text-xs font-body font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Gratis
                      </span>
                    )}
                    {canWatch ? (
                      <Link
                        href={`/cursos/${course.id}/leccion/${lesson.id}`}
                        className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar de acción */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-4">
            <div className="text-center mb-5">
              {course.priceCop === 0 ? (
                <p className="font-display text-3xl text-emerald-500">Gratis</p>
              ) : (
                <>
                  {/* El niño NUNCA ve precios */}
                  {isParent ? (
                    <p className="font-display text-3xl text-brand-600">
                      {formatCop(course.priceCop)}
                      <span className="font-body text-sm text-slate-400 block font-normal">por mes con plan</span>
                    </p>
                  ) : (
                    <p className="font-display text-2xl text-brand-600">
                      Disponible con suscripción
                    </p>
                  )}
                </>
              )}
            </div>

            {hasAccess || course.priceCop === 0 ? (
              firstFreeLesson ? (
                <Link
                  href={`/cursos/${course.id}/leccion/${firstFreeLesson.id}`}
                  className="block w-full text-center px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
                >
                  ▶️ Comenzar ahora
                </Link>
              ) : null
            ) : (
              <div className="space-y-3">
                {firstFreeLesson && (
                  <Link
                    href={`/cursos/${course.id}/leccion/${firstFreeLesson.id}`}
                    className="block w-full text-center px-5 py-3 rounded-2xl border-2 border-brand-300 text-brand-600 font-body font-semibold hover:bg-brand-50 transition-all"
                  >
                    👀 Ver lección gratis
                  </Link>
                )}
                {isParent && (
                  <Link
                    href="/planes"
                    className="block w-full text-center px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
                  >
                    🚀 Ver planes
                  </Link>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm font-body text-slate-500">
              <p>✅ {course.lessons.length} lecciones</p>
              <p>✅ Para {course.ageMin}–{course.ageMax} años</p>
              <p>✅ Chatbot IA incluido</p>
              {course.lessons.some((l) => l.isFree) && (
                <p>✅ Primera lección gratis</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
