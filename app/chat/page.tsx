"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import LanguageNameForm from "../components/LanguageNameForm";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../components/DrawingCanvas";
import { MicIcon, StopIcon, SendIcon, CheckIcon } from "../components/icons";
import { DATASET_THRESHOLD } from "@/lib/config";

export default function ChatPage() {
  const { active, activeId, loading, languages } = useLanguages();
  const [override, setOverride] = useState<"quiz" | "chat" | null>(null);
  const [adding, setAdding] = useState(false);

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;

  // On entering the Bot the user must name the language they document.
  if (languages.length === 0 || !activeId || !active) {
    return (
      <div className="flex flex-col gap-5 pt-2">
        <header>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Назовите язык
          </h1>
          <p className="mt-1 text-sm text-muted">
            С какого языка начнём? Дайте ему название, чтобы начать запись слов.
          </p>
        </header>
        <div className="card p-4">
          <LanguageNameForm />
        </div>
      </div>
    );
  }

  const chatReady = active.response_count >= DATASET_THRESHOLD;
  const mode: "quiz" | "chat" = override ?? (chatReady ? "chat" : "quiz");

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Бот
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "quiz"
            ? "Нарисуйте слово и произнесите его голосом."
            : "Свободный диалог на основе собранных данных."}
        </p>
      </header>

      {/* Active language + add new */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <LanguagePicker />
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="pressable mb-px h-12.5 shrink-0 rounded-xl bg-surface-2 px-4 text-sm font-medium text-foreground"
        >
          {adding ? "Отмена" : "+ Язык"}
        </button>
      </div>
      {adding && (
        <div className="card p-4">
          <LanguageNameForm onDone={() => setAdding(false)} />
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-xl bg-surface-2 p-1">
        <button
          onClick={() => setOverride("quiz")}
          className={`pressable flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "quiz" ? "bg-surface text-foreground shadow-sm" : "text-muted"
          }`}
        >
          Запись слов
        </button>
        <button
          onClick={() => setOverride("chat")}
          className={`pressable flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "chat" ? "bg-surface text-foreground shadow-sm" : "text-muted"
          }`}
        >
          Чат{!chatReady && " 🔒"}
        </button>
      </div>

      {mode === "quiz" ? (
        <CaptureMode languageId={activeId} />
      ) : (
        <ChatMode languageId={activeId} ready={chatReady} />
      )}
    </div>
  );
}

/* ---------------- Capture mode: draw + voice ---------------- */

type QuizImage = {
  id: string;
  image_path: string;
  label_hint: string | null;
  category: string | null;
};

function CaptureMode({ languageId }: { languageId: string }) {
  const { active, refresh } = useLanguages();
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  const [prompt, setPrompt] = useState<QuizImage | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);

  // Load the next reference picture for this language.
  const loadNextPrompt = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz?language_id=${languageId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setPrompt(json.image ?? null);
    } catch {
      setPrompt(null);
    }
  }, [languageId]);

  useEffect(() => {
    // Fetch the reference picture on mount; setState happens post-await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNextPrompt();
  }, [loadNextPrompt]);

  // Set/replace the current recording and its playback URL (revokes the old).
  function applyAudio(blob: Blob | null) {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setAudioBlob(blob);
    if (blob) {
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setAudioUrl(url);
    } else {
      setAudioUrl(null);
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        applyAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setError(null);
      setRecording(true);
    } catch {
      setError("Не удалось получить доступ к микрофону.");
    }
  }

  async function submit() {
    if (canvasRef.current?.isEmpty()) {
      setError("Сначала нарисуйте слово.");
      return;
    }
    if (!audioBlob) {
      setError("Запишите голос носителя.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const drawing = await canvasRef.current?.toBlob();
      const fd = new FormData();
      fd.append("language_id", languageId);
      if (prompt) fd.append("quiz_image_id", prompt.id);
      fd.append("audio", audioBlob, "voice.webm");
      if (drawing) fd.append("drawing", drawing, "drawing.png");
      const res = await fetch("/api/quiz", { method: "POST", body: fd });
      if (res.ok) {
        setSaved((c) => c + 1);
        applyAudio(null);
        canvasRef.current?.clear();
        refresh();
        loadNextPrompt();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Не удалось сохранить.");
      }
    } catch {
      setError("Сетевая ошибка.");
    } finally {
      setBusy(false);
    }
  }

  const total = (active?.response_count ?? 0) + saved;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Собрано слов: {total}</span>
        {saved > 0 && (
          <span className="inline-flex items-center gap-1 text-accent">
            <CheckIcon width={16} height={16} aria-hidden /> сохранено
          </span>
        )}
      </div>

      {/* Reference picture (prompt) */}
      {prompt && (
        <div className="card flex items-center gap-3 p-3">
          <Image
            src={prompt.image_path}
            alt="Что изображено?"
            width={96}
            height={96}
            unoptimized
            className="h-20 w-20 shrink-0 rounded-xl border border-border bg-white object-contain"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Назовите, что изображено
            </p>
            {prompt.category && (
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                {prompt.category}
              </p>
            )}
            <p className="text-xs text-muted">
              Нарисуйте это слово ниже и произнесите его голосом.
            </p>
          </div>
        </div>
      )}

      {/* Drawing canvas */}
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Нарисуйте слово
          </span>
          <button
            onClick={() => canvasRef.current?.clear()}
            className="pressable rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            Очистить
          </button>
        </div>
        <DrawingCanvas ref={canvasRef} className="border border-border" />
      </div>

      {/* Voice with playback */}
      <div className="card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleRecord}
            aria-label={recording ? "Остановить запись" : "Записать голос"}
            className={`pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              recording
                ? "animate-pulse bg-destructive text-white"
                : "bg-surface-2 text-primary"
            }`}
          >
            {recording ? (
              <StopIcon width={22} height={22} aria-hidden />
            ) : (
              <MicIcon width={22} height={22} aria-hidden />
            )}
          </button>
          <span className="text-sm text-muted">
            {recording
              ? "Идёт запись… нажмите, чтобы остановить"
              : audioBlob
                ? "Прослушайте запись ниже"
                : "Нажмите и произнесите слово"}
          </span>
        </div>

        {/* Playback of the voice you will send */}
        {audioUrl && !recording && (
          <audio controls src={audioUrl} className="w-full" />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={busy || recording}
        className="pressable flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-base font-medium text-primary-foreground disabled:opacity-50"
      >
        <SendIcon width={20} height={20} aria-hidden />
        {busy ? "Отправка…" : "Отправить боту"}
      </button>
    </div>
  );
}

/* ---------------- Chat mode ---------------- */

type Msg = { role: "user" | "model"; content: string };

function ChatMode({
  languageId,
  ready,
}: {
  languageId: string;
  ready: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: languageId, message }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, { role: "model", content: json.reply }]);
      } else {
        setError(json.error ?? "Ошибка генерации");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!ready && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Датасет ещё мал — ответы будут точнее после записи слов. Чат доступен в
          режиме предпросмотра.
        </div>
      )}

      <div className="flex min-h-[40vh] flex-col gap-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Спросите перевод, значение слова или правило языка.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start border border-border bg-surface text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl border border-border bg-surface px-4 py-2.5 text-muted">
            …
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-20 flex items-end gap-2 bg-background pb-1">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Сообщение…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label="Отправить"
          className="pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <SendIcon width={22} height={22} aria-hidden />
        </button>
      </div>
    </div>
  );
}
