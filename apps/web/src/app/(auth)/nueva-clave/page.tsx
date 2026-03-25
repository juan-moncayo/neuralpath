import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function NewPasswordPage() {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🛡️</div>
        <h1 className="font-display text-3xl text-slate-900 mb-2">
          Crea tu nueva contraseña
        </h1>
        <p className="font-body text-slate-500">
          Elige una contraseña segura para proteger tu cuenta
        </p>
      </div>

      {/* TODO: implementar con token de recuperación */}
      <div className="text-center space-y-4">
        <p className="font-body text-slate-600">
          Esta funcionalidad estará disponible próximamente.
          Si necesitas acceso, contacta al soporte.
        </p>
        <Link
          href="/login"
          className="block w-full text-center px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
