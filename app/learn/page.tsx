"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import { CheckIcon, RepeatIcon } from "../components/icons";
import type { DictionaryEntry } from "@/lib/types";

/**
 * Learning mode — flashcards built from the collected dataset.
 * The mission loop: speakers grow the dictionary, learners study it,
 * the language gains new speakers.
 */
export default function LearnPage() {
  const { active, activeId, loading } = useLanguages();
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);

  useEffect(() => {
    if (!activeId) return;
    setEntries(null);
    fetch(`/api/languages/${activeId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setEntries(json.entries ?? []))
      .catch(() => setEntries([]));
  }, [activeId]);

  // Only curated-enough entries are studyable: a term plus something to
  // recall it by (translation, drawing or audio).
  const cards = useMemo(
    () =>
      (entries ?? []).filter(
        (e) =>
          e.term &&
          !e.term.startsWith("—") &&
          (e.translation || e.image_url || e.audio_url),
      ),
    [entries],
  );

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;

  if (!activeId || !active)
    return (
      <div className="pt-6 text-center text-muted">
        <p>Сначала добавьте язык в разделе «Бот».</p>
        <Link href="/chat" className="text-primary underline">
          Перейти к боту
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Учить
        </h1>
        <p className="mt-1 text-sm text-muted">
          Карточки из собранного словаря: вспомните слово, проверьте себя.
        </p>
      </header>

      <LanguagePicker />

      {entries === null ? (
        <p className="text-muted">Загрузка словаря…</p>
      ) : cards.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          Пока нечего учить: нужны словарные статьи с переводом, рисунком или
          аудио. Запишите слова в «Боте» или импортируйте словарь CSV в
          «Загрузке».
        </div>
      ) : (
        <Deck key={activeId} cards={cards} />
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Deck({ cards }: { cards: DictionaryEntry[] }) {
  const [queue, setQueue] = useState<DictionaryEntry[]>(() => shuffle(cards));
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [rounds, setRounds] = useState(0);

  const current = queue[0] ?? null;
  const total = cards.length;

  const advance = useCallback(
    (wasKnown: boolean) => {
      setRevealed(false);
      setRounds((r) => r + 1);
      if (wasKnown) setKnown((k) => k + 1);
      setQueue((q) => {
        const [head, ...rest] = q;
        // Unknown cards return to the end of the queue for another pass.
        return wasKnown ? rest : [...rest, head];
      });
    },
    [],
  );

  function restart() {
    setQueue(shuffle(cards));
    setRevealed(false);
    setKnown(0);
    setRounds(0);
  }

  if (!current)
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <CheckIcon width={32} height={32} className="text-accent" aria-hidden />
        <p className="font-semibold text-foreground">
          Готово! {known} из {total} слов.
        </p>
        <p className="text-sm text-muted">Показов карточек: {rounds}</p>
        <button
          onClick={restart}
          className="pressable mt-1 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <RepeatIcon width={18} height={18} aria-hidden /> Ещё раз
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Осталось: {queue.length} / {total}
        </span>
        <span>Знаю: {known}</span>
      </div>

      {/* The prompt side: drawing / translation / audio */}
      <div className="card flex flex-col items-center gap-4 p-6">
        {current.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.image_url}
            alt="Подсказка"
            className="h-40 w-40 rounded-2xl border border-border bg-white object-contain"
          />
        )}
        {current.translation && (
          <p className="text-center text-xl text-foreground">
            {current.translation}
          </p>
        )}
        {!current.image_url && !current.translation && current.audio_url && (
          <p className="text-sm text-muted">Прослушайте и вспомните слово:</p>
        )}
        {current.audio_url && (
          <audio controls src={current.audio_url} className="w-full" />
        )}

        <p className="text-sm text-muted">Как это сказать?</p>

        {revealed ? (
          <div className="w-full rounded-2xl bg-surface-2 p-4 text-center">
            <p
              className="text-2xl text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {current.term}
            </p>
            {current.definition && (
              <p className="mt-1 text-sm text-muted">{current.definition}</p>
            )}
            {current.example && (
              <p className="mt-1 text-sm italic text-foreground/70">
                {current.example}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="pressable w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground"
          >
            Показать ответ
          </button>
        )}
      </div>

      {revealed && (
        <div className="flex gap-3">
          <button
            onClick={() => advance(false)}
            className="pressable flex-1 rounded-xl bg-surface-2 px-4 py-3 text-base font-medium text-foreground"
          >
            Ещё раз
          </button>
          <button
            onClick={() => advance(true)}
            className="pressable flex-1 rounded-xl bg-accent px-4 py-3 text-base font-medium text-white"
          >
            Знал ✓
          </button>
        </div>
      )}
    </div>
  );
}
