"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, BookOpen, Clock, Users } from "lucide-react";
import { formatCop } from "@/lib/utils";

const API_URL = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";

const CATEGORIES = [
  "Todas",
  "Matemáticas",
  "Ciencias",
  "Inglés",
  "Lenguaje",
  "Historia",
  "Arte",
];

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  priceCop: number;
  thumbnailUrl: string | null;
  instructor: { name: string };
  _count: { lessons: number };
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [total, setTotal] = useState(0);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category !== "Todas") params.set("category", category);
      if (ageMin) params.set("ageMin", ageMin);
      if (ageMax) params.set("ageMax", ageMax);

      const res = await fetch(`${API_URL}/api/courses?${params.toString()}`);
      const data = (await res.json()) as {
        data: Course[];
        pagination: { total: number };
      };
      setCourses(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, ageMin, ageMax]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-500 to-violet-600 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl mb-3">
            🎓 Catálogo de Cursos
          </h1>
          <p className="font-body text-lg text-white/80">
            Aprende con los mejores cursos para niños de 6 a 14 años
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Categorías */}
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full font-body text-sm font-semibold transition-all ${
                    category === cat
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-gray-100 text-slate-600 hover:bg-brand-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Rango de edad */}
            <div className="flex items-center gap-2 text-sm font-body text-slate-600">
              <span>Edad:</span>
              <input
                type="number"
                placeholder="Min"
                min={6}
                max={14}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none text-center"
              />
              <span>–</span>
              <input
                type="number"
                placeholder="Max"
                min={6}
                max={14}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="flex items-center justify-between">
          <p className="font-body text-sm text-slate-500">
            {loading ? "Buscando..." : `${total} curso${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          /* EE-C03: empty state */
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-display text-xl text-slate-900 mb-2">
              ¡Aún no hay cursos aquí!
            </h3>
            <p className="font-body text-slate-500 mb-6">
              Prueba buscando otra cosa o explora estas categorías:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.filter((c) => c !== "Todas").map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setSearch(""); }}
                  className="px-4 py-2 rounded-full bg-brand-100 text-brand-700 font-body text-sm font-semibold hover:bg-brand-200 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const emoji = getCategoryEmoji(course.category);

  return (
    <Link
      href={`/cursos/${course.id}`}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group"
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-6xl relative">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          emoji
        )}
        {course.priceCop === 0 && (
          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-body font-bold px-2 py-1 rounded-full">
            GRATIS
          </span>
        )}
      </div>

      <div className="p-5">
        <span className="text-xs font-body font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
          {course.category}
        </span>

        <h3 className="font-display text-lg text-slate-900 mt-2 mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {course.title}
        </h3>

        <p className="font-body text-sm text-slate-500 line-clamp-2 mb-3">
          {course.description}
        </p>

        <div className="flex items-center justify-between text-xs font-body text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.instructor.name}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {course._count.lessons} lección{course._count.lessons !== 1 ? "es" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {course.ageMin}–{course.ageMax} años
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="font-display text-lg text-brand-600">
            {course.priceCop === 0 ? "Gratis" : formatCop(course.priceCop)}
          </span>
          <span className="text-xs font-body text-brand-500 font-semibold group-hover:underline">
            Ver curso →
          </span>
        </div>
      </div>
    </Link>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Matemáticas: "🔢",
    Ciencias: "🔬",
    Inglés: "🌍",
    Lenguaje: "📖",
    Historia: "🏛️",
    Arte: "🎨",
  };
  return map[category] ?? "📚";
}
