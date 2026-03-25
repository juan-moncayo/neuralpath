import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🌟</div>
        <h1 className="font-display text-3xl text-slate-900 mb-2">
          ¡Crea tu cuenta!
        </h1>
        <p className="font-body text-slate-500">
          Comienza la aventura de aprendizaje de tu hijo hoy mismo
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
