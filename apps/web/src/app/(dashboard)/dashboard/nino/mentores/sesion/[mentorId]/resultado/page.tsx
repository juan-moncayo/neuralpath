"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResultadoPage() {
  const params = useSearchParams();
  const score = parseInt(params.get("score") ?? "0", 10);
  const duration = parseInt(params.get("duration") ?? "0", 10);
  const mentorName = params.get("mentor") ?? "tu mentor";
  const confettiLaunched = useRef(false);

  const durationStr =
    duration >= 60
      ? `${Math.floor(duration / 60)} min ${duration % 60} seg`
      : `${duration} seg`;

  let stars: string;
  let message: string;
  let bg: string;
  if (score >= 90) {
    stars = "⭐⭐⭐⭐⭐";
    message = "¡Eres una estrella!";
    bg = "from-amber-400 to-yellow-300";
  } else if (score >= 75) {
    stars = "⭐⭐⭐⭐";
    message = "¡Muy bien! Sigue así 💪";
    bg = "from-brand-500 to-violet-500";
  } else if (score >= 60) {
    stars = "⭐⭐⭐";
    message = "¡Buen intento! Practica más 🎯";
    bg = "from-emerald-500 to-teal-500";
  } else {
    stars = "⭐⭐";
    message = "¡Sigue intentando! 🚀";
    bg = "from-brand-400 to-violet-400";
  }

  // Confeti si score >= 90
  useEffect(() => {
    if (score < 90 || confettiLaunched.current) return;
    confettiLaunched.current = true;

    import("canvas-confetti")
      .then((module) => {
        const confetti = module.default;
        void confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        setTimeout(() => void confetti({ particleCount: 80, spread: 100, origin: { y: 0.4 } }), 600);
      })
      .catch(() => null);
  }, [score]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-violet-950 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        {/* Header degradado */}
        <div className={`bg-gradient-to-r ${bg} rounded-2xl p-6 mb-6 text-white`}>
          <p className="text-4xl mb-2">{stars}</p>
          <h1 className="font-display text-2xl">{message}</h1>
          <p className="font-body text-white/80 text-sm mt-1">
            Score: {score} · {durationStr}
          </p>
        </div>

        <p className="font-body text-slate-600 text-sm mb-2">
          Sesión con <strong>{mentorName}</strong>
        </p>

        {/* Notificación al padre */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-6">
          <p className="font-body text-emerald-800 text-sm">
            📩 Tu papá/mamá ya recibió el reporte de esta sesión
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard/nino/mentores"
            className="block w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all"
          >
            ¡Otra sesión!
          </Link>
          <Link
            href="/dashboard/nino/inicio"
            className="block w-full px-6 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
