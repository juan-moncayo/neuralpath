import type { Metadata } from "next";
import { BookOpen, Search } from "lucide-react";

export const metadata: Metadata = { title: "Mis Cursos" };

export default function CursosPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-slate-900">📚 Mis Cursos</h1>
          <p className="font-body text-slate-500 mt-1">Todos tus cursos en un solo lugar</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cursos..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body transition-colors"
        />
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
        <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
        <h3 className="font-display text-xl text-slate-900 mb-2">
          Aún no tienes cursos
        </h3>
        <p className="font-body text-slate-500">
          Aquí aparecerán los cursos en los que te inscribas
        </p>
      </div>
    </div>
  );
}
