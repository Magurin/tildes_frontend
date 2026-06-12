"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguages } from "./ActiveLanguageProvider";
import { useAuthSession } from "./ModeratorAuth";
import DrawingCanvas, { type DrawingCanvasHandle } from "./DrawingCanvas";
import { MicIcon, StopIcon, SendIcon, CheckIcon } from "./icons";

type QuizImage = {
  id: string;
  image_path: string;
  label_hint: string | null;
  category: string | null;
};

/** Word capture: show a reference picture, draw the word, record the voice. */
export default function CaptureMode({ languageId }: { languageId: string }) {
  const { active, refresh } = useLanguages();
  const { authHeader } = useAuthSession();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNextPrompt();
  }, [loadNextPrompt]);

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
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: authHeader,
        body: fd,
      });
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
        {busy ? "Отправка…" : "Сохранить слово"}
      </button>
    </div>
  );
}
