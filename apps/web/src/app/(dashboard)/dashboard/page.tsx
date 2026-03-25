import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Obtener el primer hijo del padre
  const child = await prisma.childProfile.findFirst({
    where: { parentId: session.user.id },
    include: {
      enrollments: {
        where: { completedAt: null },
        include: { course: { select: { title: true, thumbnailUrl: true } } },
        take: 3,
      },
      sessions: {
        where: { status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { scoreTotal: true },
      },
    },
  });

  // Contar sesiones MentorAI disponibles según el plan
  const planSessions: Record<string, number> = {
    free: 2,
    premium: 0,
    pro: 10,
  };
  const sessionsThisMonth = child?.sessions.length ?? 0;
  const maxSessions = planSessions[session.user.plan] ?? 2;
  const sessionsLeft = Math.max(0, maxSessions - sessionsThisMonth);

  const avgScore =
    child && child.sessions.length > 0
      ? Math.round(
          child.sessions.reduce((acc, s) => acc + s.scoreTotal, 0) /
            child.sessions.length
        )
      : 0;

  return (
    <DashboardHome
      userName={child?.name ?? session.user.name ?? "Amiguito"}
      avatarEmoji={child?.avatarEmoji ?? "👦"}
      activeCoursesCount={child?.enrollments.length ?? 0}
      sessionsLeft={sessionsLeft}
      maxSessions={maxSessions}
      plan={session.user.plan}
      avgScore={avgScore}
      recentEnrollments={child?.enrollments ?? []}
    />
  );
}
