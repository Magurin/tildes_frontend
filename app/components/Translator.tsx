"use client";

import { useEffect, useRef, useState } from "react";
import { SwapIcon, CopyIcon, XIcon, CheckIcon } from "./icons";
import SpeakButton from "./SpeakButton";

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

  const sourceLabel = direction === "ru2t" ? "Русский" : targetName;
  const targetLabel = direction === "ru2t" ? targetName : "Русский";

  function swap() {
    setDirection((d) => (d === "ru2t" ? "t2ru" : "ru2t"));
    // Reuse the produced translation as the new input when available.
    setText(result || text);
    setResult("");
    setError(null);
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
        if (res.ok) setResult(json.translation);
        else setError(json.error ?? "Ошибка перевода");
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

  return (
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
  );
}
