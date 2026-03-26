"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, Send, Loader2, MessageCircle, X } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_CURSOS_URL"] ?? "http://localhost:3001";

interface Lesson {
  id: string;
  title: string;
  order: number;
  isFree: boolean;
}

interface LessonDetail {
  id: string;
  title: string;
  videoUrl: string | null;
  muxPlaybackId: string | null;
  transcript: string | null;
  durationSecs: number;
}

interface ChatMessage {
  role: "child" | "ai";
  content: string;
}

interface MeResponse {
  userId: string;
  role: string;
  plan: string;
  accessToken: string | null;
  childId: string | null;
}

export default function LeccionPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const { id: courseId, lessonId } = params;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const progressReported = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json() as Promise<MeResponse | { error: string }>)
      .then((data) => { if (!("error" in data)) setMe(data); })
      .catch(() => null);
  }, []);

  const fetchData = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (me.accessToken) headers["Authorization"] = `Bearer ${me.accessToken}`;
      if (me.childId) headers["x-child-id"] = me.childId;

      const [watchRes, courseRes] = await Promise.all([
        fetch(`${API_URL}/api/lessons/${lessonId}/watch`, { headers }),
        fetch(`${API_URL}/api/courses/${courseId}`),
      ]);

      if (!watchRes.ok) {
        const errData = (await watchRes.json()) as { error: string };
        setError(errData.error ?? "No tienes acceso a esta lección");
        return;
      }

      const [watchData, courseData] = await Promise.all([
        watchRes.json() as Promise<LessonDetail>,
        courseRes.json() as Promise<{ lessons: Lesson[] }>,
      ]);

      setLesson(watchData);
      setLessons(courseData.lessons ?? []);

      if (me.childId) {
        const enrollRes = await fetch(`${API_URL}/api/enrollments/child/${me.childId}`, { headers });
        if (enrollRes.ok) {
          const enrollData = (await enrollRes.json()) as Array<{ id: string; courseId: string }>;
          const enrollment = enrollData.find((e) => e.courseId === courseId);
          if (enrollment) setEnrollmentId(enrollment.id);
        }
      }
    } catch {
      setError("Error al cargar la lección. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, me]);

  useEffect(() => { if (me) void fetchData(); }, [fetchData, me]);

  const handleVideoProgress = useCallback(
    async (currentTime: number, duration: number) => {
      if (!enrollmentId || progressReported.current || !me || duration === 0) return;
      if ((currentTime / duration) * 100 >= 90) {
        progressReported.current = true;
        try {
          await fetch(`${API_URL}/api/enrollments/${enrollmentId}/progress`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(me.accessToken ? { Authorization: `Bearer ${me.accessToken}` } : {}),
            },
            body: JSON.stringify({ progressPct: 90 }),
          });
        } catch { /* silenciar */ }
      }
    },
    [enrollmentId, me]
  );

  const sendMessage = async () => {
    if (!inputValue.trim() || sending) return;
    const question = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "child", content: question }]);
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/lesson/${lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: me?.childId ?? "", question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setMessages((prev) => [...prev, { role: "ai", content: data.answer ?? data.error ?? "No pude responder ahora 😅" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "¡Ups! Tuve un problema. Intenta de nuevo 😊" }]);
    } finally {
      setSending(false);
    }
  };

  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-brand-400" />
          <p className="font-body text-lg">Cargando lección...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-display text-2xl text-slate-900 mb-2">Acceso restringido</h2>
          <p className="font-body text-slate-500 mb-6">{error ?? "No tienes acceso a esta lección"}</p>
          <div className="space-y-3">
            <Link href={`/cursos/${courseId}`} className="block px-6 py-3 rounded-2xl bg-brand-500 text-white font-body font-semibold hover:bg-brand-600 transition-colors">
              Ver el curso
            </Link>
            <Link href="/planes" className="block px-6 py-3 rounded-2xl border-2 border-brand-300 text-brand-600 font-body font-semibold hover:bg-brand-50 transition-colors">
              🚀 Ver planes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <Link href={`/cursos/${courseId}`} className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-body font-semibold text-sm truncate flex-1">{lesson.title}</h1>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-body font-semibold hover:bg-brand-600 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Preguntar IA
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col">
          <div className="bg-black aspect-video w-full max-h-[60vh]">
            {lesson.muxPlaybackId ? (
              <MuxPlayer playbackId={lesson.muxPlaybackId} onTimeUpdate={handleVideoProgress} />
            ) : lesson.videoUrl ? (
              <video src={lesson.videoUrl} controls className="w-full h-full"
                onTimeUpdate={(e) => { const v = e.currentTarget; void handleVideoProgress(v.currentTime, v.duration); }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <div className="text-center"><div className="text-6xl mb-3">🎬</div><p className="font-body">Video próximamente disponible</p></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
            {prevLesson ? (
              <Link href={`/cursos/${courseId}/leccion/${prevLesson.id}`} className="flex items-center gap-2 text-sm font-body text-slate-300 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />Anterior
              </Link>
            ) : <div />}
            <span className="text-xs font-body text-slate-500">{currentIndex + 1} / {lessons.length}</span>
            {nextLesson ? (
              <Link href={`/cursos/${courseId}/leccion/${nextLesson.id}`} className="flex items-center gap-2 text-sm font-body text-slate-300 hover:text-white transition-colors">
                Siguiente<ChevronRight className="w-4 h-4" />
              </Link>
            ) : <div />}
          </div>

          <div className="px-4 py-4 text-center">
            <Link href="/dashboard/nino/mentores" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-brand-500 text-white font-body font-semibold text-sm hover:shadow-lg transition-all">
              🤖 ¡Practica con tu mentor!
            </Link>
          </div>
        </div>

        <div className="w-full lg:w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-body font-semibold text-sm text-slate-300">Lecciones del curso</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {lessons.map((l, idx) => (
              <Link key={l.id} href={`/cursos/${courseId}/leccion/${l.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors ${l.id === lessonId ? "bg-slate-700" : ""}`}>
                <span className="w-6 h-6 rounded-full bg-slate-700 text-xs font-body flex items-center justify-center flex-shrink-0 text-slate-400">{idx + 1}</span>
                <span className="font-body text-sm text-slate-200 flex-1 line-clamp-2">{l.title}</span>
                {l.id === lessonId && <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                {!l.isFree && l.id !== lessonId && <span className="text-slate-500 text-xs flex-shrink-0">🔒</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-end pointer-events-none">
          <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full lg:w-96 lg:mr-6 lg:mb-6 flex flex-col h-[70vh] lg:h-[500px] pointer-events-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-body font-semibold text-slate-900 text-sm">Asistente IA</p>
                  <p className="font-body text-xs text-slate-500">Pregúntame sobre la lección</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👋</div>
                  <p className="font-body text-sm text-slate-500">¡Hola! Puedes preguntarme sobre lo que estás aprendiendo.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "child" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && <span className="text-xl mr-2 flex-shrink-0 mt-1">🤖</span>}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl font-body text-sm ${msg.role === "child" ? "bg-brand-500 text-white rounded-br-md" : "bg-gray-100 text-slate-800 rounded-bl-md"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <span className="text-xl mr-2">🤖</span>
                  <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <div className="flex gap-2">
                <input type="text" placeholder="Escribe tu pregunta..." value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }}}
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none font-body text-sm text-slate-900"
                  disabled={sending} />
                <button onClick={() => void sendMessage()} disabled={sending || !inputValue.trim()}
                  className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MuxPlayer({ playbackId, onTimeUpdate }: { playbackId: string; onTimeUpdate: (current: number, duration: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <video ref={videoRef} src={`https://stream.mux.com/${playbackId}.m3u8`} controls className="w-full h-full" playsInline
      onTimeUpdate={(e) => { const v = e.currentTarget; onTimeUpdate(v.currentTime, v.duration); }} />
  );
}
