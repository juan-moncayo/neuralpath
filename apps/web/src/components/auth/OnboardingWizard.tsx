"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onboardingAction } from "@/actions/auth";

const AVATARS = ["👦", "👧", "🧒", "🧑", "👦🏽", "👧🏽", "🧒🏽", "🧑🏽"];

const INTERESTS = [
  { id: "matematicas", label: "Matemáticas", emoji: "🔢" },
  { id: "ciencias", label: "Ciencias", emoji: "🔬" },
  { id: "ingles", label: "Inglés", emoji: "🌍" },
  { id: "lectura", label: "Lectura", emoji: "📚" },
  { id: "historia", label: "Historia", emoji: "🏛️" },
  { id: "arte", label: "Arte", emoji: "🎨" },
  { id: "musica", label: "Música", emoji: "🎵" },
  { id: "tecnologia", label: "Tecnología", emoji: "💻" },
];

interface Props {
  parentId: string;
}

export default function OnboardingWizard({ parentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Paso 1
  const [childName, setChildName] = useState("");
  // Paso 2
  const [childAge, setChildAge] = useState<number>(8);
  const [avatarEmoji, setAvatarEmoji] = useState("👦");
  // Paso 3
  const [interests, setInterests] = useState<string[]>([]);

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleFinish() {
    setError(null);
    if (interests.length === 0) {
      setError("Selecciona al menos un área de interés");
      return;
    }

    const formData = new FormData();
    formData.set("childName", childName);
    formData.set("childAge", String(childAge));
    formData.set("avatarEmoji", avatarEmoji);
    interests.forEach((i) => formData.append("interests", i));

    startTransition(async () => {
      const result = await onboardingAction(parentId, formData);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body font-semibold transition-all ${
                s <= step
                  ? "bg-brand-500 text-white shadow-md"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 rounded-full transition-all ${
                  s < step ? "bg-brand-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Paso 1: Nombre */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-xl text-slate-900 mb-1">
              ¿Cómo se llama el niño o la niña? 🌈
            </h2>
            <p className="font-body text-sm text-slate-500 mb-4">
              Así lo llamaremos en la plataforma
            </p>
            <input
              type="text"
              placeholder="Ej: Juanito, María, Sofía..."
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body text-lg transition-colors"
              autoFocus
            />
          </div>
          <button
            onClick={() => childName.length >= 2 && setStep(2)}
            disabled={childName.length < 2}
            className="w-full px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md disabled:opacity-50 active:scale-95"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Paso 2: Edad y avatar */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-xl text-slate-900 mb-1">
              ¿Cuántos años tiene {childName}? 🎂
            </h2>
            <p className="font-body text-sm text-slate-500 mb-4">
              Adaptamos el contenido a su edad
            </p>

            <div className="flex items-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => setChildAge(Math.max(6, childAge - 1))}
                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-brand-100 text-xl font-display transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="font-display text-5xl text-brand-500">{childAge}</span>
                <p className="font-body text-sm text-slate-500 mt-1">años</p>
              </div>
              <button
                type="button"
                onClick={() => setChildAge(Math.min(14, childAge + 1))}
                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-brand-100 text-xl font-display transition-colors"
              >
                +
              </button>
            </div>

            <p className="font-body font-semibold text-slate-700 mb-3">
              Elige el avatar de {childName}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`h-14 rounded-2xl text-3xl transition-all ${
                    avatarEmoji === emoji
                      ? "bg-brand-100 ring-2 ring-brand-400 scale-110"
                      : "bg-gray-100 hover:bg-brand-50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md active:scale-95"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Intereses */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-xl text-slate-900 mb-1">
              ¿Qué le gusta aprender a {childName}? 🎯
            </h2>
            <p className="font-body text-sm text-slate-500 mb-4">
              Selecciona todas las que quieras
            </p>

            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleInterest(id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                    interests.includes(id)
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-brand-200 hover:bg-brand-50/50"
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="font-body font-semibold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-sm font-body">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
            >
              ← Atrás
            </button>
            <button
              onClick={handleFinish}
              disabled={isPending || interests.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-all shadow-md disabled:opacity-60 active:scale-95"
            >
              {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              ¡Empezar! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
