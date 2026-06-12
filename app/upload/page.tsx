"use client";

import { useRef, useState } from "react";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import { ModeratorLogin, useModeratorSession } from "../components/ModeratorAuth";
import { UploadIcon } from "../components/icons";

type Result = { ok: boolean; message: string };

export default function UploadPage() {
  const { activeId, active, refresh } = useLanguages();
  const { session, loading, authHeader, signOut } = useModeratorSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    if (!file || !activeId) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("language_id", activeId);
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeader,
        body: fd,
      });
      const json = await res.json();
      if (res.ok) {
        const note =
          json.document?.status === "no_embeddings"
            ? " (текст сохранён; эмбеддинги появятся после добавления ключа Gemini)"
            : [
                json.importedEntries
                  ? `импортировано слов: ${json.importedEntries}`
                  : "",
                json.ingested
                  ? `проиндексировано фрагментов: ${json.ingested}`
                  : "",
              ]
                .filter(Boolean)
                .map((part) => ` · ${part}`)
                .join("");
        setResult({
          ok: true,
          message: `Загружено: ${file.name}${note}`,
        });
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        refresh();
      } else {
        setResult({ ok: false, message: json.error ?? "Ошибка загрузки" });
      }
    } catch {
      setResult({ ok: false, message: "Сетевая ошибка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Загрузка материалов
        </h1>
        <p className="mt-1 text-sm text-muted">
          PDF и TXT пополняют базу знаний (RAG). CSV/TSV со столбцами
          «слово, перевод» импортируются сразу в словарь.
        </p>
      </header>

      {loading ? (
        <p className="text-muted">Загрузка…</p>
      ) : !session ? (
        <ModeratorLogin />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Модератор: {session.user.email}</span>
            <button onClick={signOut} className="pressable text-primary underline">
              Выйти
            </button>
          </div>

          <LanguagePicker label="Язык материала" />

      <div className="card p-4">
        <label
          htmlFor="file"
          className="pressable flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-2 px-4 py-8 text-center"
        >
          <UploadIcon width={28} height={28} className="text-primary" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            {file ? file.name : "Выберите PDF, TXT или CSV/TSV"}
          </span>
          <span className="text-xs text-muted">Нажмите, чтобы выбрать файл</span>
          <input
            id="file"
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.csv,.tsv,application/pdf,text/plain,text/csv,text/tab-separated-values"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={submit}
          disabled={!file || !activeId || busy}
          className="pressable mt-4 w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Загрузка…" : `Загрузить${active ? ` для «${active.name}»` : ""}`}
        </button>

        {result && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 text-sm ${
              result.ok ? "text-accent" : "text-destructive"
            }`}
          >
            {result.message}
          </p>
        )}
          </div>
        </>
      )}
    </div>
  );
}
