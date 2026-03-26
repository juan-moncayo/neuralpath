"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Eye, EyeOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatCop } from "@/lib/utils";

const API_URL = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";

interface Course {
  id: string;
  title: string;
  category: string;
  ageMin: number;
  ageMax: number;
  priceCop: number;
  isPublished: boolean;
  _count: { lessons: number; enrollments: number };
}

interface NewCourseForm {
  title: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  priceCop: number;
}

const CATEGORIES = ["Matemáticas", "Ciencias", "Inglés", "Lenguaje", "Historia", "Arte"];

export default function InstructorPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const [form, setForm] = useState<NewCourseForm>({
    title: "",
    description: "",
    category: "Matemáticas",
    ageMin: 6,
    ageMax: 12,
    priceCop: 0,
  });

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonOrder, setLessonOrder] = useState(1);
  const [lessonFree, setLessonFree] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const getUserHeaders = useCallback(() => {
    const userId = localStorage.getItem("userId") ?? "";
    const userRole = localStorage.getItem("userRole") ?? "instructor";
    return {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-user-role": userRole,
      "x-user-plan": localStorage.getItem("userPlan") ?? "free",
    };
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem("userId") ?? "";
      if (!userId) { router.push("/login"); return; }

      const headers = getUserHeaders();
      const res = await fetch(`${API_URL}/api/courses/instructor/${userId}`, { headers });
      if (res.status === 403) { router.push("/dashboard"); return; }

      const data = (await res.json()) as Course[];
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setError("Error al cargar los cursos");
    } finally {
      setLoading(false);
    }
  }, [getUserHeaders, router]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/courses`, {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        setError(data.error ?? "Error al crear el curso");
        return;
      }

      setShowForm(false);
      setForm({ title: "", description: "", category: "Matemáticas", ageMin: 6, ageMax: 12, priceCop: 0 });
      await fetchCourses();
    } catch {
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (courseId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/courses/${courseId}/publish`, {
        method: "POST",
        headers: getUserHeaders(),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        setError(data.error);
        return;
      }
      await fetchCourses();
    } catch {
      setError("Error al publicar");
    }
  };

  const handleAddLesson = async (courseId: string) => {
    if (!lessonTitle.trim()) return;
    setAddingLesson(true);

    try {
      const res = await fetch(`${API_URL}/api/lessons/courses/${courseId}`, {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ title: lessonTitle, order: lessonOrder, isFree: lessonFree }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        setError(data.error);
        return;
      }

      setLessonTitle("");
      setLessonOrder((prev) => prev + 1);
      await fetchCourses();
    } catch {
      setError("Error al crear la lección");
    } finally {
      setAddingLesson(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-slate-900">🎓 Panel del Instructor</h1>
            <p className="font-body text-slate-500 mt-1">
              Crea y gestiona tus cursos
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold text-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo curso
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 font-body text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* Formulario nuevo curso */}
        {showForm && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-display text-xl text-slate-900 mb-5">
              ✏️ Nuevo curso
            </h2>
            <form onSubmit={(e) => void handleCreateCourse(e)} className="space-y-4">
              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Matemáticas Divertidas para Niños"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                />
              </div>

              <div>
                <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                  Descripción *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe de qué trata el curso..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                    Categoría *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                    Precio COP (0 = gratis)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.priceCop}
                    onChange={(e) => setForm((p) => ({ ...p, priceCop: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                    Edad mínima
                  </label>
                  <input
                    type="number" min={6} max={14}
                    value={form.ageMin}
                    onChange={(e) => setForm((p) => ({ ...p, ageMin: parseInt(e.target.value, 10) }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm font-semibold text-slate-700 mb-1.5">
                    Edad máxima
                  </label>
                  <input
                    type="number" min={6} max={14}
                    value={form.ageMax}
                    onChange={(e) => setForm((p) => ({ ...p, ageMax: parseInt(e.target.value, 10) }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md disabled:opacity-60 transition-all"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creando...
                    </span>
                  ) : (
                    "Crear curso"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de cursos */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
            <h3 className="font-display text-xl text-slate-900 mb-2">
              Sin cursos todavía
            </h3>
            <p className="font-body text-slate-500">
              ¡Crea tu primer curso y comparte tu conocimiento! 🚀
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-lg text-slate-900 truncate">
                        {course.title}
                      </h3>
                      <span
                        className={`text-xs font-body font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          course.isPublished
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {course.isPublished ? "Publicado ✅" : "Borrador 📝"}
                      </span>
                    </div>
                    <p className="font-body text-sm text-slate-500">
                      {course.category} · {course.ageMin}–{course.ageMax} años ·{" "}
                      {course._count.lessons} lección{course._count.lessons !== 1 ? "es" : ""} ·{" "}
                      {course._count.enrollments} estudiante{course._count.enrollments !== 1 ? "s" : ""} ·{" "}
                      {course.priceCop === 0 ? "Gratis" : formatCop(course.priceCop)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => void handleTogglePublish(course.id)}
                      title={course.isPublished ? "Despublicar" : "Publicar"}
                      className={`p-2 rounded-xl transition-colors ${
                        course.isPublished
                          ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                      }`}
                    >
                      {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() =>
                        setExpandedCourse(expandedCourse === course.id ? null : course.id)
                      }
                      className="p-2 rounded-xl bg-gray-100 text-slate-600 hover:bg-gray-200 transition-colors"
                    >
                      {expandedCourse === course.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Agregar lección */}
                {expandedCourse === course.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <h4 className="font-body font-semibold text-sm text-slate-700 mb-3">
                      ➕ Agregar lección
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        placeholder="Título de la lección"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        className="flex-1 min-w-48 px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        value={lessonOrder}
                        onChange={(e) => setLessonOrder(parseInt(e.target.value, 10))}
                        className="w-20 px-3 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body text-sm text-center"
                        title="Orden"
                      />
                      <label className="flex items-center gap-2 font-body text-sm text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lessonFree}
                          onChange={(e) => setLessonFree(e.target.checked)}
                          className="w-4 h-4 accent-brand-500"
                        />
                        Gratis
                      </label>
                      <button
                        onClick={() => void handleAddLesson(course.id)}
                        disabled={addingLesson || !lessonTitle.trim()}
                        className="px-4 py-2.5 rounded-2xl bg-brand-500 text-white font-body font-semibold text-sm hover:bg-brand-600 disabled:opacity-60 transition-colors"
                      >
                        {addingLesson ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Agregar"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
