import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getActiveChildId } from "@/lib/active-child";

export const metadata: Metadata = { title: "Mis Mentores — NeuralPath" };

const PLAN_LIMITS: Record<string, number> = { free: 2, premium: 0, pro: 10 };

export default async function NinoMentoresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const childId = getActiveChildId();
  if (!childId) redirect("/dashboard/padre");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [child, allMentors, sessionsThisMonth] = await Promise.all([
    prisma.childProfile.findUnique({
      where: { id: childId },
      select: { name: true, age: true },
    }),
    prisma.mentor.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mentorSession.count({
      where: {
        childId,
        createdAt: { gte: startOfMonth },
        status: "completed",
      },
    }),
  ]);

  if (!child) redirect("/dashboard/padre");

  // Filtrar mentores por edad del niño
  const mentors = allMentors.filter(
    (m) => m.ageMin <= child.age && child.age <= m.ageMax
  );

  const plan = session.user.plan as string;
  const limit = PLAN_LIMITS[plan] ?? 2;
  const isPremiumOnly = plan === "premium"; // Premium no incluye MentorAI
  const isPro = plan === "pro";
  const isFree = plan === "free";
  const sessionsLeft = isPro ? Math.max(0, limit - sessionsThisMonth) : isFree ? Math.max(0, limit - sessionsThisMonth) : 0;
  const sessionLimitReached = (isFree || isPro) && limit > 0 && sessionsLeft === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">🤖 Mis Mentores</h1>
        <p className="font-body text-slate-500 mt-1">
          Elige tu tutor IA favorito y aprende con {child.name}
        </p>
      </div>

      {/* Banner de sesiones */}
      {isPremiumOnly ? (
        <div className="rounded-3xl px-5 py-4 flex items-center gap-3 bg-violet-50 border border-violet-200">
          <span className="text-2xl">✨</span>
          <p className="font-body text-sm text-slate-700">
            Las sesiones con MentorAI están disponibles en el{" "}
            <strong className="text-violet-700">Plan Pro 🚀</strong>.{" "}
            Pídele a papá o mamá que actualicen el plan.
          </p>
        </div>
      ) : sessionLimitReached ? (
        <div className="rounded-3xl px-5 py-4 flex items-center gap-3 bg-amber-50 border border-amber-200">
          <span className="text-2xl">⚠️</span>
          <p className="font-body text-sm text-slate-700">
            <strong>No quedan sesiones este mes.</strong> Pídele a papá o mamá que activen el{" "}
            <Link href="/dashboard/padre/plan" className="underline font-semibold text-brand-600">
              Plan Pro 🚀
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-3xl px-5 py-4 flex items-center gap-3 bg-brand-50 border border-brand-200">
          <span className="text-2xl">🤖</span>
          <p className="font-body text-sm text-slate-700">
            {isPro ? (
              <>
                Te quedan{" "}
                <strong className="text-brand-700">{sessionsLeft} sesión{sessionsLeft !== 1 ? "es" : ""}</strong>{" "}
                disponibles este mes
              </>
            ) : (
              <>
                Te quedan{" "}
                <strong className="text-brand-700">{sessionsLeft} sesión{sessionsLeft !== 1 ? "es" : ""} gratis</strong>{" "}
                este mes
              </>
            )}
          </p>
        </div>
      )}

      {mentors.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-body text-slate-500">
            No hay mentores disponibles para tu edad ({child.age} años) aún.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mentors.map((mentor) => {
          const canStart = !isPremiumOnly && !sessionLimitReached;

          return (
            <div
              key={mentor.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-violet-100 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-sm">
                {mentor.emoji}
              </div>

              <h3 className="font-display text-lg text-slate-900 mb-0.5">
                {mentor.name}
              </h3>
              <p className="font-body text-sm text-brand-500 font-semibold mb-1">
                {mentor.specialty}
              </p>
              <p className="font-body text-xs text-slate-500 mb-4">
                {mentor.ageMin}–{mentor.ageMax} años
              </p>

              {canStart ? (
                <Link
                  href={`/dashboard/nino/mentores/sesion/${mentor.id}`}
                  className="block w-full px-4 py-2.5 rounded-2xl font-body font-semibold text-sm text-center bg-gradient-to-r from-brand-500 to-violet-500 text-white hover:shadow-md transition-all"
                >
                  🎓 Practicar
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full px-4 py-2.5 rounded-2xl font-body font-semibold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  {isPremiumOnly ? "Solo en Plan Pro ✨" : "Sin sesiones 🔒"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
