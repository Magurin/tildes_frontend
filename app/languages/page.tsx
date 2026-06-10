"use client";

import Link from "next/link";
import { useLanguages } from "../components/ActiveLanguageProvider";
import { ChevronRight, CheckIcon } from "../components/icons";
import { DATASET_THRESHOLD } from "@/lib/config";

const statusLabel: Record<string, string> = {
  endangered: "под угрозой",
  "critically endangered": "на грани исчезновения",
  dormant: "спящий",
};

export default function LanguagesPage() {
  const { languages, loading, activeId, setActiveId } = useLanguages();

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Языки
        </h1>
        <p className="mt-1 text-sm text-muted">
          Выберите язык, чтобы открыть словарь и прогресс датасета.
        </p>
      </header>

      {loading && <p className="text-muted">Загрузка…</p>}

      {!loading && languages.length === 0 && (
        <div className="card p-6 text-center text-muted">
          Пока нет языков.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {languages.map((l) => {
          const ready =
            l.response_count + l.entry_count >= DATASET_THRESHOLD;
          const isActive = l.id === activeId;
          return (
            <li key={l.id}>
              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2
                        className="truncate text-lg text-foreground"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {l.name}
                      </h2>
                      {l.native_name && (
                        <span className="truncate text-sm text-muted">
                          {l.native_name}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-primary">
                      {statusLabel[l.status] ?? l.status}
                    </p>
                  </div>
                  <Link
                    href={`/languages/${l.id}`}
                    aria-label={`Открыть ${l.name}`}
                    className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-foreground"
                  >
                    <ChevronRight width={20} height={20} aria-hidden />
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span>Ответов: {l.response_count}</span>
                  <span>Слов: {l.entry_count}</span>
                  {ready && (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <CheckIcon width={16} height={16} aria-hidden /> чат готов
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setActiveId(l.id)}
                  disabled={isActive}
                  className={`pressable mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-surface-2 text-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isActive ? "Активный язык" : "Сделать активным"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
