"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";
import { forgotPasswordAction } from "@/actions/auth";

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        <p className="font-body text-slate-700">
          Si ese email está registrado, recibirás un link en unos minutos.
          Revisa también tu carpeta de spam.
        </p>
        <Link
          href="/login"
          className="block w-full text-center px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-body font-semibold text-slate-700 mb-1.5">
          Email de tu cuenta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body transition-colors"
        />
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-sm font-body">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md disabled:opacity-60"
      >
        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
        Enviar link de recuperación
      </button>

      <Link
        href="/login"
        className="block text-center text-sm font-body text-slate-500 hover:text-brand-500"
      >
        ← Volver al inicio de sesión
      </Link>
    </form>
  );
}
