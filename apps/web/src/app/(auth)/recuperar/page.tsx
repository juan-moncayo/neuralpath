import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔑</div>
        <h1 className="font-display text-3xl text-slate-900 mb-2">
          Recupera tu contraseña
        </h1>
        <p className="font-body text-slate-500">
          Te enviaremos un link a tu correo para restablecer tu contraseña
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
