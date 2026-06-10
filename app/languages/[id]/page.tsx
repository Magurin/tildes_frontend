"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Language, DictionaryEntry, DocumentRow } from "@/lib/types";
import {
  PencilIcon,
  TrashIcon,
  DownloadIcon,
  XIcon,
  CheckIcon,
} from "@/app/components/icons";

type Detail = {
  language: Language;
  entries: DictionaryEntry[];
  documents: DocumentRow[];
  responseCount: number;
  threshold: number;
  chatReady: boolean;
};

export default function LanguageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`/api/languages/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter((e) =>
      [e.term, e.translation, e.definition, e.example]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [data, query]);

  function replaceEntry(updated: DictionaryEntry) {
    setData((d) =>
      d
        ? {
            ...d,
            entries: d.entries.map((e) => (e.id === updated.id ? updated : e)),
          }
        : d,
    );
  }

  function removeEntry(idToRemove: string) {
    setData((d) =>
      d
        ? { ...d, entries: d.entries.filter((e) => e.id !== idToRemove) }
        : d,
    );
  }

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;
  if (error || !data)
    return (
      <div className="pt-6">
        <p className="text-muted">Язык не найден.</p>
        <Link href="/languages" className="text-primary underline">
          ← К списку
        </Link>
      </div>
    );

  const { language, documents, responseCount, threshold, chatReady } = data;
  const progress = Math.min(100, Math.round((responseCount / threshold) * 100));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/languages" className="text-sm text-muted">
        ← Языки
      </Link>

      <header>
        <h1
          className="text-3xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {language.name}
        </h1>
        {language.native_name && (
          <p className="text-lg text-muted">{language.native_name}</p>
        )}
        {language.description && (
          <p className="mt-2 text-[15px] leading-6 text-foreground/80">
            {language.description}
          </p>
        )}
      </header>

      {/* Dataset progress */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Датасет</h2>
          <span className="text-sm text-muted">
            {responseCount} / {threshold}
          </span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={responseCount}
          aria-valuemin={0}
          aria-valuemax={threshold}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {chatReady
            ? "Достаточно данных — режим чата доступен."
            : "Пройдите викторину, чтобы открыть режим чата."}
        </p>
        <Link
          href="/chat"
          className="pressable mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {chatReady ? "Открыть чат" : "Продолжить викторину"}
        </Link>
      </section>

      {/* Dictionary */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2
            className="text-xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Словарь ({data.entries.length})
          </h2>
          {data.entries.length > 0 && (
            <div className="flex gap-2">
              <a
                href={`/api/languages/${language.id}/export?format=csv`}
                className="pressable inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <DownloadIcon width={14} height={14} aria-hidden /> CSV
              </a>
              <a
                href={`/api/languages/${language.id}/export?format=cldf`}
                className="pressable inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <DownloadIcon width={14} height={14} aria-hidden /> CLDF
              </a>
            </div>
          )}
        </div>

        {data.entries.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по словарю…"
            aria-label="Поиск по словарю"
            className="mb-3 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {data.entries.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            Слов пока нет. Они появятся из ответов носителя и загруженных
            материалов.
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            Ничего не найдено по запросу «{query}».
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                onSaved={replaceEntry}
                onDeleted={removeEntry}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Documents */}
      <section>
        <h2
          className="mb-2 text-xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Материалы ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            Нет загруженных словарей или учебников.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="card flex items-center justify-between p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {d.filename}
                </span>
                <span className="ml-2 shrink-0 text-[11px] uppercase tracking-wide text-muted">
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------- Dictionary entry with inline curation ------------- */

function EntryCard({
  entry,
  onSaved,
  onDeleted,
}: {
  entry: DictionaryEntry;
  onSaved: (e: DictionaryEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    term: entry.term,
    translation: entry.translation ?? "",
    definition: entry.definition ?? "",
    example: entry.example ?? "",
  });

  async function save() {
    if (!form.term.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dictionary/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: form.term,
          translation: form.translation || null,
          definition: form.definition || null,
          example: form.example || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onSaved(json.entry);
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Удалить «${entry.term}» из словаря?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dictionary/${entry.id}`, {
        method: "DELETE",
      });
      if (res.ok) onDeleted(entry.id);
    } finally {
      setBusy(false);
    }
  }

  if (editing)
    return (
      <li className="card flex flex-col gap-2 p-3">
        {(
          [
            ["term", "Слово *"],
            ["translation", "Перевод"],
            ["definition", "Определение"],
            ["example", "Пример"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-muted">
            {label}
            <input
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        ))}
        <div className="mt-1 flex gap-2">
          <button
            onClick={save}
            disabled={busy || !form.term.trim()}
            className="pressable inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <CheckIcon width={16} height={16} aria-hidden /> Сохранить
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            aria-label="Отменить правку"
            className="pressable inline-flex items-center justify-center rounded-lg bg-surface-2 px-3 py-2 text-foreground"
          >
            <XIcon width={16} height={16} aria-hidden />
          </button>
        </div>
      </li>
    );

  return (
    <li className="card flex gap-3 p-3">
      {entry.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image_url}
          alt={`Рисунок: ${entry.term}`}
          className="h-16 w-16 shrink-0 rounded-xl border border-border bg-white object-contain"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-semibold text-foreground">
            {entry.term}
          </span>
          {entry.translation && (
            <span className="shrink-0 text-sm text-muted">
              {entry.translation}
            </span>
          )}
        </div>
        {entry.definition && (
          <p className="mt-1 text-sm text-foreground/70">{entry.definition}</p>
        )}
        {entry.example && (
          <p className="mt-1 text-sm italic text-foreground/60">
            {entry.example}
          </p>
        )}
        {entry.audio_url && (
          <audio controls src={entry.audio_url} className="mt-2 h-8 w-full" />
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-primary/70">
            {entry.source}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              aria-label={`Править «${entry.term}»`}
              className="pressable rounded-lg p-2 text-muted hover:text-foreground"
            >
              <PencilIcon width={16} height={16} aria-hidden />
            </button>
            <button
              onClick={remove}
              disabled={busy}
              aria-label={`Удалить «${entry.term}»`}
              className="pressable rounded-lg p-2 text-muted hover:text-destructive"
            >
              <TrashIcon width={16} height={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
