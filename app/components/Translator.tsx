"use client";

import { useState } from "react";
import { SwapIcon, CopyIcon, XIcon, CheckIcon } from "./icons";

/**
 * Two-panel translator (Russian ↔ target language) backed by /api/translate.
 * Mirrors the familiar Google/Yandex layout: source on the left, result on
 * the right, a swap button between the headers.
 */
export default function Translator({
  languageId,
  targetName,
}: {
  languageId: string;
  targetName: string;
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

  async function translate() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    setResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: languageId, text: value, direction }),
      });
      const json = await res.json();
      if (res.ok) setResult(json.translation);
      else setError(json.error ?? "Ошибка перевода");
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

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
      <div className="grid grid-cols-[1fr_auto_1fr]">
        {/* Source header */}
        <div className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          {sourceLabel}
        </div>
        {/* Swap */}
        <button
          onClick={swap}
          aria-label="Поменять языки местами"
          className="pressable flex items-center justify-center border-x border-border px-3 text-primary"
        >
          <SwapIcon width={20} height={20} aria-hidden />
        </button>
        {/* Target header */}
        <div className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          {targetLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border md:grid-cols-2">
        {/* Source panel */}
        <div className="relative md:border-r border-border">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                translate();
              }
            }}
            rows={4}
            maxLength={2000}
            placeholder={
              direction === "ru2t"
                ? "Введите текст по-русски…"
                : `Введите текст на «${targetName}»…`
            }
            className="min-h-[140px] w-full resize-none bg-transparent px-4 py-3.5 text-lg leading-7 focus:outline-none"
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
        <div className="relative min-h-[140px] border-t border-border bg-surface-2/40 px-4 py-3.5 md:border-t-0">
          <p className="whitespace-pre-wrap text-lg leading-7 text-foreground">
            {busy ? (
              <span className="text-muted">Перевожу…</span>
            ) : (
              result || <span className="text-muted">Перевод</span>
            )}
          </p>
          {result && !busy && (
            <button
              onClick={copy}
              aria-label="Скопировать перевод"
              className="pressable absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              {copied ? (
                <CheckIcon width={16} height={16} aria-hidden />
              ) : (
                <CopyIcon width={16} height={16} aria-hidden />
              )}
              {copied ? "Скопировано" : "Копировать"}
            </button>
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
        <button
          onClick={translate}
          disabled={busy || !text.trim()}
          className="pressable rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Перевести
        </button>
      </div>
    </div>
  );
}
