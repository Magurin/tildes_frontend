"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguages } from "./ActiveLanguageProvider";
import { ChevronRight, XIcon, CheckIcon, BookIcon } from "./icons";

/** Status → short Russian label + accent colour class. */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  vulnerable: { label: "уязвимый", cls: "text-amber-600" },
  endangered: { label: "под угрозой", cls: "text-orange-600" },
  severely: { label: "на грани", cls: "text-red-600" },
  dormant: { label: "спящий", cls: "text-stone-500" },
};

function statusOf(status: string) {
  const key = Object.keys(STATUS_META).find((k) => status.includes(k));
  return key ? STATUS_META[key] : { label: status, cls: "text-muted" };
}

/**
 * Active-language control: shows the current language as a big pill and opens
 * a card-grid modal to switch. Replaces the plain dropdown and the separate
 * "Языки" tab — language choice now lives where it is used.
 */
export default function LanguageSwitcher() {
  const { languages, active, setActiveId, loading } = useLanguages();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.native_name ?? "").toLowerCase().includes(q),
    );
  }, [languages, query]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        disabled={loading || languages.length === 0}
        className="pressable flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-left disabled:opacity-50"
      >
        <span className="min-w-0">
          <span
            className="block truncate text-xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {active?.name ?? "Выберите язык"}
          </span>
          {active?.native_name && (
            <span className="block truncate text-sm text-muted">
              {active.native_name}
            </span>
          )}
        </span>
        <span className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-primary">
          Сменить
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                className="text-xl text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Выберите язык
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="pressable rounded-full p-1.5 text-muted hover:text-foreground"
              >
                <XIcon width={22} height={22} aria-hidden />
              </button>
            </div>

            <div className="border-b border-border p-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти язык…"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {filtered.map((l) => {
                const st = statusOf(l.status);
                const isActive = l.id === active?.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      setActiveId(l.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`pressable flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-surface-2"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="truncate text-base text-foreground"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {l.name}
                        </span>
                        {isActive && (
                          <CheckIcon
                            width={16}
                            height={16}
                            className="shrink-0 text-primary"
                            aria-hidden
                          />
                        )}
                      </span>
                      {l.native_name && (
                        <span className="block truncate text-xs text-muted">
                          {l.native_name}
                        </span>
                      )}
                      <span className="mt-0.5 flex items-center gap-2 text-[11px]">
                        <span className={`font-medium uppercase ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className="text-muted">· {l.entry_count} слов</span>
                      </span>
                    </span>
                    <Link
                      href={`/languages/${l.id}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Словарь языка ${l.name}`}
                      className="pressable shrink-0 rounded-lg p-2 text-muted hover:text-primary"
                    >
                      <BookIcon width={18} height={18} aria-hidden />
                    </Link>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-muted">
                  Ничего не найдено.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <Link
                href="/languages"
                onClick={() => setOpen(false)}
                className="pressable inline-flex items-center gap-1 text-sm text-primary"
              >
                Все словари
                <ChevronRight width={16} height={16} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
