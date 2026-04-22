"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, MicOff, PhoneOff, Loader2, WifiOff } from "lucide-react";

const API_MENTOR_URL =
  process.env["NEXT_PUBLIC_API_MENTOR_URL"] ?? "http://localhost:3003";
const WS_URL = API_MENTOR_URL.replace(/^http/, "ws");

// NEUR-77: máximo de reintentos de reconexión
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 3000;
// Heartbeat cada 20s para detectar desconexión rápido
const HEARTBEAT_INTERVAL_MS = 20000;

type Phase = "mic_check" | "connecting" | "active" | "reconnecting" | "ended";

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
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isMentorSpeaking, setIsMentorSpeaking] = useState(false);
  const [mentorName, setMentorName] = useState("tu mentor");
  const [mentorEmoji, setMentorEmoji] = useState("🤖");
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  // NEUR-73: aviso si alcanza límite durante la sesión activa
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  // NEUR-77: contador de reconexiones
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const elapsedSecsRef = useRef(0);

  // Sincronizar ref con state para acceso en callbacks sin stale closure
  useEffect(() => { elapsedSecsRef.current = elapsedSecs; }, [elapsedSecs]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json() as Promise<MeResponse | { error: string }>)
      .then((d) => { if (!("error" in d)) setMe(d); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Timer de sesión
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

  // ── NEUR-77: Heartbeat para detectar desconexión ─────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Conectar/reconectar WebSocket ────────────────────────────────────────
  const connect = useCallback(
    (isReconnect = false) => {
      if (!me) return;
      if (wsRef.current) {
        wsRef.current.onclose = null; // evitar doble reconexión
        wsRef.current.close();
      }

      const ws = new WebSocket(`${WS_URL}/ws/session/${mentorId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "auth",
            token: me.accessToken ?? "",
            childId: me.childId ?? "",
          })
        );
        if (isReconnect) {
          reconnectAttemptsRef.current = 0;
          setReconnectAttempt(0);
        }
        startHeartbeat();
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
          sessionIdRef.current = (msg["sessionId"] as string) ?? null;
          if (!isReconnect) {
            setConversation([{ role: "mentor", text: greeting }]);
          }
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
        } else if (type === "pong") {
          // heartbeat ok — no hacer nada
        } else if (type === "limit_warning") {
          // NEUR-73: aviso límite durante sesión activa
          setLimitWarning((msg["message"] as string) ?? null);
        } else if (type === "latency") {
          if (process.env["NODE_ENV"] === "development") {
            console.log(
              `[latency] STT=${String(msg["stt_ms"])}ms ` +
              `LLM=${String(msg["llm_ms"])}ms ` +
              `TTS=${String(msg["tts_ms"])}ms ` +
              `total=${String(msg["total_ms"])}ms`
            );
          }
        } else if (type === "session_ended") {
          const finalScore = (msg["score"] as number) ?? 0;
          const duration = (msg["duration_secs"] as number) ?? elapsedSecsRef.current;
          setPhase("ended");
          stopHeartbeat();
          ws.close();
          router.push(
            `/dashboard/nino/mentores/sesion/${mentorId}/resultado` +
            `?score=${finalScore}&duration=${duration}&mentor=${encodeURIComponent(mentorName)}`
          );
        } else if (type === "error") {
          setError((msg["message"] as string) ?? "Error en la sesión");
          setPhase("mic_check");
          stopHeartbeat();
          ws.close();
        }
      };

      ws.onerror = () => {
        stopHeartbeat();
        // El onclose se encargará de la reconexión
      };

      ws.onclose = () => {
        stopHeartbeat();
        if (timerRef.current) clearInterval(timerRef.current);

        // NEUR-77: EE-M02 — intentar reconectar si la sesión estaba activa
        if (
          phase === "active" &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current += 1;
          setReconnectAttempt(reconnectAttemptsRef.current);
          setPhase("reconnecting");

          reconnectTimerRef.current = setTimeout(() => {
            connect(true);
          }, RECONNECT_DELAY_MS);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, mentorId, mentorName, router, startHeartbeat, stopHeartbeat]
  );

  useEffect(() => {
    if (phase === "connecting" && me) connect(false);
  }, [phase, me, connect]);

  // ── Grabación ─────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e: BlobEvent) => {
        if (
          e.data.size === 0 ||
          !wsRef.current ||
          wsRef.current.readyState !== WebSocket.OPEN
        ) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(",")[1];
          if (b64 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
          }
        };
        reader.readAsDataURL(e.data);
      };

      mr.start(250);
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
    stopHeartbeat();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
    // Limpiar timer de reconexión si el usuario termina voluntariamente
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
  }, [stopRecording, stopHeartbeat]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopRecording();
      stopHeartbeat();
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [stopRecording, stopHeartbeat]);

  // ── Phase: mic_check ───────────────────────────────────────────────────────
  if (phase === "mic_check") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-brand-600 to-violet-700 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">🎤</div>
          <h2 className="font-display text-2xl text-slate-900 mb-2">Activar micrófono</h2>
          {error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-left">
              <p className="font-body text-sm text-amber-800 whitespace-pre-line">{error}</p>
            </div>
          ) : (
            <p className="font-body text-slate-500 mb-6 text-sm">
              Necesitamos tu micrófono para hablar con tu mentor IA.
            </p>
          )}
          <button
            onClick={() => { setError(null); void requestMic(); }}
            className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 text-white font-body font-semibold hover:shadow-md transition-all mb-3"
          >
            Activar micrófono 🎤
          </button>
          <Link
            href="/dashboard/nino/mentores"
            className="block font-body text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Volver a mentores
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase: connecting ──────────────────────────────────────────────────────
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

  // ── Phase: reconnecting (NEUR-77) ─────────────────────────────────────────
  if (phase === "reconnecting") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <WifiOff className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="font-display text-xl text-slate-900 mb-2">
            Se fue la conexión 😅
          </h2>
          <p className="font-body text-slate-500 mb-4 text-sm">
            Reconectando automáticamente... ({reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS})
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-4" />
          <button
            onClick={() => {
              if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
              endSession();
              router.push("/dashboard/nino/mentores");
            }}
            className="w-full px-6 py-3 rounded-2xl border-2 border-gray-200 text-slate-600 font-body font-semibold hover:bg-gray-50 transition-all"
          >
            Salir de la sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: active ──────────────────────────────────────────────────────────
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

      {/* NEUR-73: Banner límite alcanzado durante sesión */}
      {limitWarning && (
        <div className="flex-shrink-0 bg-amber-500/90 px-4 py-2 text-center">
          <p className="font-body text-sm text-white font-semibold">{limitWarning}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mentor avatar + subtítulos */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div
            className="text-[120px] leading-none select-none transition-transform duration-300"
            style={{
              transform: isMentorSpeaking ? "scale(1.12)" : "scale(1)",
              animation: isMentorSpeaking ? "pulse 0.6s ease-in-out infinite alternate" : "none",
            }}
          >
            {mentorEmoji}
          </div>

          {mentorText && (
            <div className="max-w-sm bg-slate-800/80 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
              <p className="font-body text-white text-sm leading-relaxed">{mentorText}</p>
            </div>
          )}

          {transcript && (
            <div className="max-w-sm bg-brand-500/20 border border-brand-500/30 rounded-2xl px-4 py-2 text-center">
              <p className="font-body text-brand-300 text-xs">Tú: {transcript}</p>
            </div>
          )}
        </div>

        {/* Stats + conversación */}
        <div className="w-full lg:w-72 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-4">
            <span className="font-body text-sm text-slate-400">⏱ {formatTime(elapsedSecs)}</span>
          </div>

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

      {/* Controles */}
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