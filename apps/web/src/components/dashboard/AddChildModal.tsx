"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { createChildAction } from "@/actions/children";

const AVATAR_EMOJIS = ["👦", "👧", "🧒", "👼", "🦊", "🐼", "🦁", "🐱", "🐶", "🐸"];
const INTERESTS = [
  "Matemáticas", "Ciencias", "Inglés", "Lenguaje",
  "Historia", "Arte", "Música", "Tecnología",
];

export default function AddChildModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [selectedEmoji, setSelectedEmoji] = useState("👦");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("age", age.toString());
    formData.set("avatarEmoji", selectedEmoji);
    selectedInterests.forEach((i) => formData.append("interests", i));

    startTransition(async () => {
      const result = await createChildAction(formData);
      if (result.success) {
        setOpen(false);
        setName("");
        setAge(8);
        setSelectedEmoji("👦");
        setSelectedInterests([]);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-2xl bg-brand-500 text-white font-body font-semibold text-sm hover:bg-brand-600 transition-colors"
      >
        + Agregar hijo/a
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-slate-900">
                ✨ Nuevo perfil
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                  Nombre del niño/a *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                />
              </div>

              {/* Edad */}
              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                  Edad: {age} años
                </label>
                <input
                  type="range"
                  min={6}
                  max={14}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs font-body text-slate-400 mt-1">
                  <span>6 años</span>
                  <span>14 años</span>
                </div>
              </div>

              {/* Avatar emoji */}
              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-2">
                  Avatar
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-11 h-11 text-2xl rounded-2xl transition-all ${
                        selectedEmoji === emoji
                          ? "bg-brand-100 ring-2 ring-brand-400 scale-110"
                          : "bg-gray-100 hover:bg-brand-50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intereses */}
              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-2">
                  Áreas de interés *
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full font-body text-sm font-semibold transition-all ${
                        selectedInterests.includes(interest)
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-slate-600 hover:bg-brand-100"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm font-body text-red-600 bg-red-50 px-4 py-2 rounded-2xl">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md disabled:opacity-60 transition-all"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </span>
                  ) : (
                    "Crear perfil 🎉"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
