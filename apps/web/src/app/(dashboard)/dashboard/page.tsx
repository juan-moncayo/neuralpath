import { redirect } from "next/navigation";

/** /dashboard → redirige siempre al hub del padre */
export default function DashboardPage() {
  redirect("/dashboard/padre");
}
