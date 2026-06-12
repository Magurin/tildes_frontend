"use client";

import { useEffect, useRef, useState } from "react";
import { SwapIcon, CopyIcon, XIcon, CheckIcon, MicIcon, StopIcon } from "./icons";
import SpeakButton from "./SpeakButton";

/* ---------------- Translation history (localStorage) ---------------- */

type HistoryItem = {
  text: string;
  result: string;
  direction: "ru2t" | "t2ru";
  languageId: string;
  ts: number;
};

const HISTORY_KEY = "tildes-translate-history";
const HISTORY_MAX = 10;

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Two-panel translator (Russian ↔ target language) backed by /api/translate.
 * Mirrors the familiar Google/Yandex layout: source on the left, result on
 * the right, a swap button between the headers.
 */
export default function Translator({
  languageId,
  targetName,
  isoCode,
}: {
  languageId: string;
  targetName: string;
  isoCode?: string | null;
}) {
  // direction "ru2t": source Russian → target language.
  const [direction, setDirection] = useState<"ru2t" | "t2ru">("ru2t");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // localStorage is client-only; populate after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
  }, []);

  function saveToHistory(item: HistoryItem) {
    // Typing produces a chain of prefix queries («при», «привет») — keep
    // only the longest; also collapse exact repeats.
    const rest = loadHistory().filter(
      (h) =>
        !(
          h.languageId === item.languageId &&
          h.direction === item.direction &&
          (item.text.startsWith(h.text) || h.text.startsWith(item.text))
        ),
    );
    const next = [item, ...rest].slice(0, HISTORY_MAX);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* storage may be full or blocked; history is best-effort */
    }
    setHistory(next);
  }

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    setHistory([]);
  }

  const sourceLabel = direction === "ru2t" ? "Русский" : targetName;
  const targetLabel = direction === "ru2t" ? targetName : "Русский";

  function swap() {
    setDirection((d) => (d === "ru2t" ? "t2ru" : "ru2t"));
    // Reuse the produced translation as the new input when available.
    setText(result || text);
    setResult("");
    setError(null);
  }

  // Voice input (ru2t): record Russian speech, transcribe via Deepgram,
  // drop the text into the source box — auto-translate picks it up.
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          fd.append("language", "ru");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const json = await res.json();
          if (json.transcript) setText(json.transcript);
          else setError("Не удалось распознать речь — попробуйте ещё раз");
        } catch {
          setError("Сетевая ошибка при распознавании");
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setError(null);
      setRecording(true);
    } catch {
      setError("Нет доступа к микрофону");
    }
  }

  // Auto-translate: fire after the user pauses typing; newer input aborts
  // the in-flight request so stale results never overwrite fresh ones.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const value = text.trim();
    abortRef.current?.abort();
    if (!value) {
      setResult("");
      setError(null);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language_id: languageId, text: value, direction }),
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (ctrl.signal.aborted) return;
        if (res.ok) {
          setResult(json.translation);
          saveToHistory({
            text: value,
            result: json.translation,
            direction,
            languageId,
            ts: Date.now(),
          });
        } else setError(json.error ?? "Ошибка перевода");
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setError("Сетевая ошибка");
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, direction, languageId]);

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  const visibleHistory = history.filter((h) => h.languageId === languageId);

  return (
    <>
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-[1fr_auto_1fr] bg-surface-2/40">
        {/* Source header */}
        <div className="px-4 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-foreground">
          {sourceLabel}
        </div>
        {/* Swap */}
        <button
          onClick={swap}
          aria-label="Поменять языки местами"
          className="pressable flex items-center justify-center border-x border-border px-4 text-primary hover:bg-surface"
        >
          <SwapIcon width={22} height={22} aria-hidden />
        </button>
        {/* Target header */}
        <div className="px-4 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-foreground">
          {targetLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border md:grid-cols-2">
        {/* Source panel */}
        <div className="relative md:border-r border-border">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder={
              direction === "ru2t"
                ? "Введите текст по-русски…"
                : `Введите текст на «${targetName}»…`
            }
            className="min-h-[44dvh] w-full resize-none bg-transparent px-5 py-5 text-2xl leading-9 focus:outline-none md:min-h-[48dvh]"
          />
          {text && (
            <button
              onClick={() => {
                setText("");
                setResult("");
              }}
              aria-label="Очистить"
              className="pressable absolute right-2 top-2 rounded-full p-1.5 text-muted hover:text-foreground"
            >
              <XIcon width={18} height={18} aria-hidden />
            </button>
          )}
          {direction === "ru2t" && (
            <button
              onClick={toggleRecord}
              disabled={transcribing}
              aria-label={recording ? "Остановить запись" : "Надиктовать по-русски"}
              className={`pressable absolute bottom-2 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs ${
                recording
                  ? "animate-pulse bg-destructive text-white"
                  : "bg-surface-2 text-muted hover:text-primary"
              } disabled:opacity-50`}
            >
              {recording ? (
                <StopIcon width={16} height={16} aria-hidden />
              ) : (
                <MicIcon width={16} height={16} aria-hidden />
              )}
              {recording
                ? "Говорите…"
                : transcribing
                  ? "Распознаю…"
                  : "Голосом"}
            </button>
          )}
        </div>

        {/* Target panel */}
        <div className="relative min-h-[44dvh] border-t border-border bg-surface-2/40 px-5 py-5 md:min-h-[48dvh] md:border-t-0">
          <p className="whitespace-pre-wrap text-2xl leading-9 text-foreground">
            {busy ? (
              <span className="text-muted">Перевожу…</span>
            ) : (
              result || <span className="text-muted">Перевод</span>
            )}
          </p>
          {result && !busy && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              {direction === "ru2t" && (
                <SpeakButton text={result} isoCode={isoCode} onError={setError} />
              )}
              <button
                onClick={copy}
                aria-label="Скопировать перевод"
                className="pressable inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                {copied ? (
                  <CheckIcon width={16} height={16} aria-hidden />
                ) : (
                  <CopyIcon width={16} height={16} aria-hidden />
                )}
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="border-t border-border px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-xs text-muted">{text.length} / 2000</span>
        <span className="text-xs text-muted">
          {busy ? "Перевожу…" : "Перевод появляется по мере ввода"}
        </span>
      </div>
    </div>

    {/* History: recent queries for this language, tap to re-run */}
    {visibleHistory.length > 0 && (
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            История
          </h2>
          <button
            onClick={clearHistory}
            className="pressable text-xs text-muted hover:text-foreground"
          >
            Очистить
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {visibleHistory.map((h) => (
            <li key={`${h.ts}-${h.direction}`}>
              <button
                onClick={() => {
                  setDirection(h.direction);
                  setText(h.text);
                }}
                className="pressable w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-left"
              >
                <span className="block truncate text-[15px] text-foreground">
                  {h.text}
                </span>
                <span className="block truncate text-sm text-muted">
                  {h.result}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )}
    </>
  );
}
