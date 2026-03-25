"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { loginAction } from "@/actions/auth";

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="space-y-5">
      {/* Google */}
      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border-2 border-gray-200 hover:border-brand-300 hover:bg-brand-50 font-body font-semibold transition-all disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continuar con Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-slate-500 font-body">o con tu email</span>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-body font-semibold text-slate-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="papá@email.com"
            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-body font-semibold text-slate-700">
              Contraseña
            </label>
            <Link
              href="/recuperar"
              className="text-sm text-brand-500 hover:text-brand-600 font-body"
            >
              ¿Olvidaste tu clave?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Tu contraseña"
              className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-sm font-body">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md disabled:opacity-60 active:scale-95"
        >
          {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          Iniciar sesión
        </button>
      </form>

      <p className="text-center text-sm font-body text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-brand-500 font-semibold hover:text-brand-600">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
