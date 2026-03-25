import type { Metadata } from "next";
import { prisma } from "@neuralpath/database";

export const metadata: Metadata = { title: "Mis Mentores" };

export default async function MentoresPage() {
  const mentors = await prisma.mentor.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">🤖 Mis Mentores</h1>
        <p className="font-body text-slate-500 mt-1">
          Elige tu tutor favorito y aprende con IA
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mentors.map((mentor) => (
          <div
            key={mentor.id}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-violet-100 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-sm">
              {mentor.emoji}
            </div>

            <h3 className="font-display text-lg text-slate-900 mb-1">
              {mentor.name}
            </h3>
            <p className="font-body text-sm text-brand-500 font-semibold mb-2">
              {mentor.specialty}
            </p>
            <p className="font-body text-xs text-slate-500 mb-4">
              Para niños de {mentor.ageMin} a {mentor.ageMax} años
            </p>

            <button
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold text-sm opacity-60 cursor-not-allowed"
              title="Próximamente disponible"
            >
              Próximamente 🚧
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
