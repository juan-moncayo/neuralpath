import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">👋</div>
        <h1 className="font-display text-3xl text-slate-900 mb-2">
          ¡Bienvenido de vuelta!
        </h1>
        <p className="font-body text-slate-500">
          Ingresa para continuar tu aventura de aprendizaje
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
