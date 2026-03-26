import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { enterChildProfileAction } from "@/actions/children";
import AddChildModal from "@/components/dashboard/AddChildModal";

export const metadata: Metadata = { title: "Mis Hijos — NeuralPath" };

export default async function PadrePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const children = await prisma.childProfile.findMany({
    where: { parentId: session.user.id },
    select: {
      id: true,
      name: true,
      age: true,
      avatarEmoji: true,
      enrollments: {
        where: { completedAt: null },
        select: { id: true },
      },
      sessions: {
        where: { createdAt: { gte: startOfMonth }, status: "completed" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const planSessions: Record<string, number> = { free: 2, premium: 0, pro: 10 };
  const maxSessions = planSessions[session.user.plan] ?? 2;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          ¿Quién va a aprender hoy? 📚
        </h1>
        <p className="font-body text-slate-500 mt-1">
          Hola, {session.user.name?.split(" ")[0] ?? "papá"} 👋 — Selecciona el perfil del niño
        </p>
      </div>

      {children.length === 0 ? (
        /* Onboarding directo si no tiene hijos */
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="font-display text-2xl text-slate-900 mb-2">
            ¡Crea el primer perfil!
          </h2>
          <p className="font-body text-slate-500 mb-6 max-w-md mx-auto">
            Agrega a tu hijo/a para comenzar su aventura de aprendizaje en NeuralPath.
          </p>
          <AddChildModal />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {children.map((child) => {
              const sessionsUsed = child.sessions.length;
              const sessionsLeft = Math.max(0, maxSessions - sessionsUsed);

              return (
                <div
                  key={child.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all text-center"
                >
                  {/* Avatar */}
                  <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-5xl shadow-sm">
                    {child.avatarEmoji}
                  </div>

                  <h3 className="font-display text-xl text-slate-900 mb-0.5">
                    {child.name}
                  </h3>
                  <p className="font-body text-sm text-slate-500 mb-4">
                    {child.age} años
                  </p>

                  <div className="flex justify-center gap-4 mb-5 text-sm font-body text-slate-500">
                    <span>
                      📚 <strong className="text-slate-800">{child.enrollments.length}</strong> cursos
                    </span>
                    <span>
                      🤖 <strong className="text-slate-800">{sessionsLeft}</strong> sesiones
                    </span>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await enterChildProfileAction(child.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
                    >
                      Entrar como {child.name} →
                    </button>
                  </form>
                </div>
              );
            })}

            {/* Card agregar hijo */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-dashed border-gray-200 hover:border-brand-300 transition-all text-center flex flex-col items-center justify-center min-h-[280px]">
              <div className="text-5xl mb-3">➕</div>
              <h3 className="font-display text-lg text-slate-700 mb-1">
                Agregar hijo/a
              </h3>
              <p className="font-body text-sm text-slate-400 mb-4">
                Crea un nuevo perfil de aprendizaje
              </p>
              <AddChildModal />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
