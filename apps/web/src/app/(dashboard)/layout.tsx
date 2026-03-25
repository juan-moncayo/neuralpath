import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-64">
        <DashboardHeader user={session.user} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
