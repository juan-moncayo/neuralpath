import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Layout raíz del grupo (dashboard).
 *  Solo verifica que el usuario esté autenticado.
 *  Cada sub-layout (padre/ y nino/) tiene su propio sidebar y header.
 */
export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <>{children}</>;
}
