import Link from "next/link";
import { getActiveChildId } from "@/lib/active-child";
import { prisma } from "@neuralpath/database";

export default async function CursosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const childId = getActiveChildId();

  let child: { name: string; avatarEmoji: string } | null = null;
  if (childId) {
    child = await prisma.childProfile.findUnique({
      where: { id: childId },
      select: { name: true, avatarEmoji: true },
    });
  }

  return (
    <>
      {child ? (
        /* Navbar del niño */
        <nav className="bg-gradient-to-r from-brand-500 to-violet-600 sticky top-0 z-30 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link
              href="/dashboard/nino/inicio"
              className="flex items-center gap-1.5 text-sm font-body font-semibold text-white/90 hover:text-white transition-colors"
            >
              ← Volver a mi inicio
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-lg">{child.avatarEmoji}</span>
              <span className="font-body font-semibold text-white text-sm">
                {child.name}
              </span>
            </div>
          </div>
        </nav>
      ) : (
        /* Navbar del padre */
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link
              href="/dashboard/padre"
              className="flex items-center gap-1.5 text-sm font-body font-semibold text-slate-600 hover:text-brand-600 transition-colors"
            >
              ← Volver al dashboard
            </Link>
            <span className="font-display text-brand-600 text-sm">NeuralPath</span>
          </div>
        </nav>
      )}
      {children}
    </>
  );
}
