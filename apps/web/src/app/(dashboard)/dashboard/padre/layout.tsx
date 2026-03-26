import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PadreSidebar from "@/components/dashboard/PadreSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default async function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Solo padres y admins acceden a este dashboard
  if (!["parent", "admin"].includes(session.user.role)) {
    redirect("/dashboard/nino/inicio");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 flex">
      <PadreSidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <DashboardHeader user={session.user} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
