import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getActiveChildId } from "@/lib/active-child";

export const metadata: Metadata = { title: "Mis Mentores — NeuralPath" };

const PLAN_SESSIONS: Record<string, number> = { free: 2, premium: 0, pro: 10 };

export default async function NinoMentoresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const childId = getActiveChildId();
  if (!childId) redirect("/dashboard/padre");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [mentors, sessionsThisMonth] = await Promise.all([
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

  const maxSessions = PLAN_SESSIONS[session.user.plan] ?? 2;
  const sessionsLeft = Math.max(0, maxSessions - sessionsThisMonth);
  const hasAccess = session.user.plan === "pro" || session.user.plan === "premium";
  const noSessions = maxSessions > 0 && sessionsLeft === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">🤖 Mis Mentores</h1>
        <p className="font-body text-slate-500 mt-1">
          Elige tu tutor IA favorito y aprende
        </p>
      </div>

      {/* Sesiones disponibles */}
      {maxSessions > 0 && (
        <div
          className={`rounded-3xl px-5 py-4 flex items-center gap-3 ${
            noSessions
              ? "bg-amber-50 border border-amber-200"
              : "bg-brand-50 border border-brand-200"
          }`}
        >
          <span className="text-2xl">{noSessions ? "⚠️" : "🤖"}</span>
          <p className="font-body text-sm text-slate-700">
            {noSessions ? (
              <>
                {/* EE-M08: 0 sesiones */}
                <strong>No quedan sesiones este mes.</strong> Pídele a papá o mamá que activen el{" "}
                <Link href="/dashboard/padre/plan" className="underline font-semibold text-brand-600">
                  Plan Pro 🚀
                </Link>
              </>
            ) : (
              <>
                Te quedan{" "}
                <strong className="text-brand-700">{sessionsLeft} sesión{sessionsLeft !== 1 ? "es" : ""}</strong>{" "}
                disponibles este mes
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mentors.map((mentor) => {
          const canStart = hasAccess && !noSessions;

          return (
            <div
              key={mentor.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              {/* Avatar */}
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

              <button
                disabled={!canStart}
                title={!canStart ? (noSessions ? "Sin sesiones disponibles" : "Requiere plan premium") : undefined}
                className={`w-full px-4 py-2.5 rounded-2xl font-body font-semibold text-sm transition-all ${
                  canStart
                    ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white hover:shadow-md cursor-pointer"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {canStart ? "🎓 Practicar" : noSessions ? "Sin sesiones 🔒" : "Próximamente 🚧"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
