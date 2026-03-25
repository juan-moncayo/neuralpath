import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-violet-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧠</span>
          <span className="font-display text-2xl text-brand-600">NeuralPath</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-2xl border-2 border-brand-500 text-brand-600 font-body font-semibold hover:bg-brand-50 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="px-5 py-2 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-colors shadow-md"
          >
            Comenzar gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="text-6xl mb-6 animate-bounce-slow">🚀</div>
        <h1 className="font-display text-5xl md:text-6xl text-slate-900 mb-6 leading-tight">
          Aprende con tu{" "}
          <span className="text-gradient">Mentor IA</span>{" "}
          favorito
        </h1>
        <p className="font-body text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          Cursos divertidos y tutores inteligentes que hablan contigo en tiempo real.
          Diseñado para niños colombianos de 6 a 14 años. ✨
        </p>
        <Link
          href="/registro"
          className="inline-block px-10 py-4 rounded-3xl bg-brand-500 text-white font-display text-xl hover:bg-brand-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          ¡Empieza tu aventura! 🎯
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              emoji: "📚",
              title: "Cursos en Video",
              desc: "Aprende matemáticas, ciencias, inglés y más con videos divertidos.",
              color: "from-brand-400 to-brand-600",
            },
            {
              emoji: "🤖",
              title: "MentorAI",
              desc: "Habla con tu tutor IA en tiempo real. ¡Responde todas tus preguntas!",
              color: "from-violet-400 to-violet-600",
            },
            {
              emoji: "🏆",
              title: "Logros y Premios",
              desc: "Gana puntos, completa retos y muéstrale tus avances a tus papás.",
              color: "from-sky-400 to-sky-600",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-8 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-4 shadow-md`}
              >
                {f.emoji}
              </div>
              <h3 className="font-display text-xl text-slate-900 mb-2">{f.title}</h3>
              <p className="font-body text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
