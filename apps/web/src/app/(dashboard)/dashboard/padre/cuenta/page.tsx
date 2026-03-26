import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlanLabel, getPlanColor, cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";

export const metadata: Metadata = { title: "Mi Cuenta — NeuralPath" };

export default async function CuentaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">⚙️ Mi Cuenta</h1>
        <p className="font-body text-slate-500 mt-1">Información de tu cuenta</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-display text-xl text-slate-900 mb-5">Perfil</h2>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-display text-2xl shadow-md">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="font-body font-semibold text-slate-900 text-lg">
              {user.name}
            </p>
            <p className="font-body text-slate-500 text-sm">{user.email}</p>
            <span
              className={cn(
                "inline-block text-xs font-body font-semibold px-3 py-1 rounded-full mt-1",
                getPlanColor(user.plan)
              )}
            >
              {getPlanLabel(user.plan)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-display text-xl text-slate-900 mb-4">Sesión</h2>
        <form action={logoutAction}>
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-rose-50 text-rose-600 font-body font-semibold text-sm hover:bg-rose-100 transition-colors"
          >
            Cerrar sesión →
          </button>
        </form>
      </div>
    </div>
  );
}
