import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";

export const metadata: Metadata = { title: "Feedback MentorAI — NeuralPath" };

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Obtener todos los hijos del padre
  const children = await prisma.childProfile.findMany({
    where: { parentId: session.user.id },
    select: { id: true, name: true, avatarEmoji: true },
  });

  const childIds = children.map((c) => c.id);
  const childMap = Object.fromEntries(children.map((c) => [c.id, c]));

  // Feedback de todas las sesiones de todos los hijos
  const feedbacks = await prisma.sessionFeedback.findMany({
    where: {
      session: {
        childId: { in: childIds },
      },
    },
    include: {
      session: {
        include: {
          mentor: { select: { name: true, emoji: true, specialty: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const isPro = session.user.plan === "pro";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">📩 Feedback de Sesiones</h1>
        <p className="font-body text-slate-500 mt-1">
          Reportes automáticos de las sesiones con MentorAI
        </p>
      </div>

      {!isPro && (
        <div className="bg-violet-50 border border-violet-200 rounded-3xl p-5">
          <p className="font-body text-violet-800 text-sm">
            🔒 Los reportes detallados de sesiones están disponibles en el{" "}
            <strong>Plan Pro</strong>.{" "}
            <a href="/planes" className="underline font-semibold hover:text-violet-900">
              Mejorar plan →
            </a>
          </p>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-display text-xl text-slate-900 mb-2">
            Sin feedback todavía
          </h3>
          <p className="font-body text-slate-500">
            El feedback aparece aquí tras completar sesiones con los mentores IA.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((fb) => {
            const child = childMap[fb.session.childId];
            const sessionDate = new Date(fb.session.startedAt).toLocaleDateString("es-CO", {
              day: "numeric", month: "long", year: "numeric",
            });

            return (
              <div key={fb.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  {/* Mentor */}
                  <div className="text-4xl">{fb.session.mentor.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg text-slate-900">
                        {fb.session.mentor.name}
                      </h3>
                      <span className="text-xs font-body text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                        {fb.session.mentor.specialty}
                      </span>
                    </div>
                    <p className="font-body text-sm text-slate-500 mt-0.5">
                      {child?.avatarEmoji} {child?.name ?? "Niño"} · {sessionDate} ·{" "}
                      {Math.round(fb.session.durationSecs / 60)} min ·{" "}
                      <strong className="text-brand-600">
                        {fb.session.scoreTotal} pts
                      </strong>
                    </p>
                  </div>
                </div>

                {isPro ? (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <FeedbackSection emoji="⭐" title="Fortalezas" text={fb.strengths} />
                    <FeedbackSection emoji="📈" title="Áreas a mejorar" text={fb.improvements} />
                    <FeedbackSection emoji="💡" title="Recomendaciones" text={fb.recommendations} />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl px-5 py-4 text-center">
                    <p className="font-body text-sm text-slate-400">
                      🔒 Activa el Plan Pro para ver el feedback completo
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackSection({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4">
      <p className="font-body text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {emoji} {title}
      </p>
      <p className="font-body text-sm text-slate-700">{text}</p>
    </div>
  );
}
