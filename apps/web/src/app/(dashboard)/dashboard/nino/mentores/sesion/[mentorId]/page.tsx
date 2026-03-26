"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";

const API_MENTOR_URL =
  process.env["NEXT_PUBLIC_API_MENTOR_URL"] ?? "http://localhost:3003";
const WS_URL = API_MENTOR_URL.replace(/^http/, "ws");

type Phase = "mic_check" | "connecting" | "active" | "ended";

interface ConvEntry {
  role: "mentor" | "child";
  text: string;
}

interface MeResponse {
  userId: string;
  accessToken: string | null;
  childId: string | null;
  plan: string;
}

export default function SesionPage() {
  const params = useParams<{ mentorId: string }>();
  const router = useRouter();
  const { mentorId } = params;

  const [phase, setPhase] = useState<Phase>("mic_check");
  const [transcript, setTranscript] = useState("");
  const [mentorText, setMentorText] = useState("");
  const [conversation, setConversation] = useState<ConvEntry[]>([]);
  const [score, setScore] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isMentorSpeaking, setIsMentorSpeaking] = useState(false);
  const [mentorName, setMentorName] = useState("tu mentor");
  const [mentorEmoji, setMentorEmoji] = useState("🤖");
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json() as Promise<MeResponse | { error: string }>)
      .then((d) => { if (!("error" in d)) setMe(d); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Timer
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Mic check
  const requestMic = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPhase("connecting");
    } catch {
      setError(
        "Activa el micrófono para hablar con el mentor 🎤\n" +
        "Chrome: haz clic en el candado de la barra de URL"
      );
    }
  }, []);

  // Connect WebSocket
  const connect = useCallback(async () => {
    if (!me) return;
    const ws = new WebSocket(`${WS_URL}/ws/session/${mentorId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "auth",
        token: me.accessToken ?? "",
        childId: me.childId ?? "",
      }));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data) as Record<string, unknown>; }
      catch { return; }

      const type = msg["type"] as string;

      if (type === "session_ready") {
        setMentorName((msg["mentorName"] as string) ?? "tu mentor");
        setMentorEmoji((msg["mentorEmoji"] as string) ?? "🤖");
        const greeting = (msg["greeting"] as string) ?? "";
        setMentorText(greeting);
        setConversation([{ role: "mentor", text: greeting }]);
        setPhase("active");
      } else if (type === "transcript") {
        const text = (msg["text"] as string) ?? "";
        setTranscript(text);
        setConversation((prev) => [...prev, { role: "child", text }]);
      } else if (type === "mentor_text") {
        const text = (msg["text"] as string) ?? "";
        setMentorText(text);
        setIsMentorSpeaking(true);
        setConversation((prev) => [...prev, { role: "mentor", text }]);
      } else if (type === "mentor_audio") {
        const data = (msg["data"] as string) ?? "";
        if (data) {
          try {
            const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: "audio/mp3" });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
              setIsMentorSpeaking(false);
              URL.revokeObjectURL(url);
            };
            void audio.play();
          } catch { setIsMentorSpeaking(false); }
        }
      } else if (type === "latency") {
        if (process.env["NODE_ENV"] === "development") {
          console.log(`[latency] STT=${String(msg["stt_ms"])}ms LLM=${String(msg["llm_ms"])}ms TTS=${String(msg["tts_ms"])}ms total=${String(msg["total_ms"])}ms`);
        }
      } else if (type === "session_ended") {
        const finalScore = (msg["score"] as number) ?? 0;
        const duration = (msg["duration_secs"] as number) ?? elapsedSecs;
        setPhase("ended");
        ws.close();
        router.push(
          `/dashboard/nino/mentores/sesion/${mentorId}/resultado?score=${finalScore}&duration=${duration}&mentor=${encodeURIComponent(mentorName)}`
        );
      } else if (type === "error") {
        setError((msg["message"] as string) ?? "Error en la sesión");
        setPhase("mic_check");
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("No pudimos conectar con el mentor. Intenta de nuevo.");
      setPhase("mic_check");
    };

    ws.onclose = () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [me, mentorId, mentorName, elapsedSecs, router]);

  useEffect(() => {
    if (phase === "connecting" && me) void connect();
  }, [phase, me, connect]);

  // Recording handlers
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size === 0 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(",")[1];
          if (b64 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
          }
        };
        reader.readAsDataURL(e.data);
      };

      mr.start(250); // chunks cada 250ms
      setIsRecording(true);
    } catch { /* micrófono no disponible */ }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  }, [isRecording]);

  const endSession = useCallback(() => {
    stopRecording();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopRecording]);

  // ── Phase: mic_check ──────────────────────────────────
  if (phase === "mic_check") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-brand-600 to-violet-700 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">🎤</div>
          <h2 className="font-display text-2xl text-slate-900 mb-2">
            Activar micrófono
          </h2>
          {error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-left">
              <p className="font-body text-sm text-amber-800 whitespace-pre-line">{error}</p>
            </div>
          ) : (
            <p className="font-body text-slate-500 mb-6 text-sm">
              Necesitamos tu micrófono para que puedas hablar con tu mentor IA.
            </p>
          )}
          <button
            onClick={() => { setError(null); void requestMic(); }}
            className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all mb-3"
          >
            Activar micrófono 🎤
          </button>
          <Link href="/dashboard/nino/mentores" className="block font-body text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Volver a mentores
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase: connecting ─────────────────────────────────
  if (phase === "connecting") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-brand-600 to-violet-700 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" />
          <p className="font-display text-2xl">Conectando con tu mentor...</p>
          <p className="font-body text-white/70 mt-2 text-sm">Preparando la sesión ✨</p>
        </div>
      </div>
    );
  }

  // ── Phase: active ─────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <Link
          href="/dashboard/nino/mentores"
          onClick={endSession}
          className="text-slate-400 hover:text-white transition-colors font-body text-sm flex items-center gap-1"
        >
          ← Volver
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-display text-white text-sm">{mentorName}</span>
          <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-body font-bold px-2 py-0.5 rounded-full animate-pulse">
            🔴 EN VIVO
          </span>
        </div>
        <div />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: mentor avatar + subtitles */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          {/* Emoji animado del mentor */}
          <div
            className="text-[120px] leading-none select-none transition-transform duration-300"
            style={{
              transform: isMentorSpeaking ? "scale(1.12)" : "scale(1)",
              animation: isMentorSpeaking ? "pulse 0.6s ease-in-out infinite alternate" : "none",
            }}
          >
            {mentorEmoji}
          </div>

          {/* Subtítulos */}
          {mentorText && (
            <div className="max-w-sm bg-slate-800/80 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
              <p className="font-body text-white text-sm leading-relaxed">{mentorText}</p>
            </div>
          )}

          {/* Transcript del niño */}
          {transcript && (
            <div className="max-w-sm bg-brand-500/20 border border-brand-500/30 rounded-2xl px-4 py-2 text-center">
              <p className="font-body text-brand-300 text-xs">Tú: {transcript}</p>
            </div>
          )}
        </div>

        {/* Right: stats + conversation */}
        <div className="w-full lg:w-72 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col">
          {/* Stats */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-4">
            <span className="font-body text-sm text-amber-400 font-semibold">⭐ {score}</span>
            <span className="font-body text-sm text-slate-400">⏱ {formatTime(elapsedSecs)}</span>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="font-body text-xs text-slate-500 text-center mb-2">💬 Conversación</p>
            {conversation.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === "child" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl font-body text-xs ${
                  entry.role === "mentor"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-brand-500 text-white"
                }`}>
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={conversationEndRef} />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-center gap-4">
        <button
          onPointerDown={() => void startRecording()}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-body font-semibold text-sm transition-all select-none ${
            isRecording
              ? "bg-red-500 text-white scale-105 shadow-lg shadow-red-500/30"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {isRecording ? "Suelta para enviar" : "🎤 Mantén para hablar"}
        </button>

        <button
          onClick={endSession}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-body font-semibold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          Terminar
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          from { transform: scale(1.0); }
          to { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
