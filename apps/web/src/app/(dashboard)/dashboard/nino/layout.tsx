import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import { getActiveChildId } from "@/lib/active-child";
import NinoSidebar from "@/components/dashboard/NinoSidebar";
import NinoHeader from "@/components/dashboard/NinoHeader";

export default async function NinoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Leer cookie del hijo activo
  const activeChildId = getActiveChildId();
  if (!activeChildId) {
    redirect("/dashboard/padre");
  }

  // Cargar el perfil del niño desde Turso
  const child = await prisma.childProfile.findFirst({
    where: {
      id: activeChildId,
      parentId: session.user.id,
    },
    select: { id: true, name: true, age: true, avatarEmoji: true },
  });

  if (!child) {
    // Cookie inválida o hijo no pertenece a este padre
    redirect("/dashboard/padre");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-brand-50/30 flex">
      <NinoSidebar childName={child.name} childEmoji={child.avatarEmoji} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <NinoHeader childName={child.name} childEmoji={child.avatarEmoji} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
