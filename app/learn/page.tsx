"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import { CheckIcon, XIcon, RepeatIcon, HeartIcon } from "../components/icons";
import SpeakButton from "../components/SpeakButton";
import type { DictionaryEntry } from "@/lib/types";
import { buildLesson, type Exercise } from "./exercises";
import {
  load,
  save,
  dayIndex,
  sortForStudy,
  nextState,
  bumpStreak,
  xpFor,
  comboMult,
  levelInfo,
  masteredCount,
  DAILY_GOAL,
  type LearnProgress,
} from "./progress";

/**
 * Learning mode — an interactive, Duolingo-style lesson built from the
 * collected dataset. Exercises (pick the translation, fill the blank, assemble
 * the sentence, spell the word) sit on top of a spaced-repetition + XP/streak
 * layer so progress is meaningful and sticky.
 */
export default function LearnPage() {
  const { active, activeId, loading } = useLanguages();
  // Keyed by language id so a stale response from a previous language can never
  // overwrite the current one — and so we don't setState synchronously to reset.
  const [data, setData] = useState<{
    id: string;
    entries: DictionaryEntry[];
  } | null>(null);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    fetch(`/api/languages/${activeId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setData({ id: activeId, entries: json.entries ?? [] });
      })
      .catch(() => {
        if (!cancelled) setData({ id: activeId, entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const entries = data && data.id === activeId ? data.entries : null;

  // Studyable = a term plus something to recall it by.
  const cards = useMemo(
    () =>
      (entries ?? []).filter(
        (e) =>
          e.term &&
          !e.term.startsWith("—") &&
          (e.translation || e.image_url || e.audio_url || e.example),
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
          Урок из собранного словаря: собирайте предложения, вставляйте слова,
          зарабатывайте опыт.
        </p>
      </header>

      <LanguagePicker />

      {entries === null ? (
        <p className="text-muted">Загрузка словаря…</p>
      ) : cards.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          Пока нечего учить: нужны словарные статьи с переводом, примером, рисунком
          или аудио. Запишите слова в «Боте» или импортируйте словарь CSV в
          «Загрузке».
        </div>
      ) : (
        <Lesson key={activeId} cards={cards} isoCode={active.iso_code} />
      )}
    </div>
  );
}

const LESSON_SIZE = 12;
const MAX_HEARTS = 5;

/** Owns the round counter so "ещё урок" rebuilds with freshly-due cards. */
function Lesson({
  cards,
  isoCode,
}: {
  cards: DictionaryEntry[];
  isoCode?: string | null;
}) {
  const [round, setRound] = useState(0);
  return (
    <LessonRound
      key={round}
      cards={cards}
      isoCode={isoCode}
      onAgain={() => setRound((r) => r + 1)}
    />
  );
}

type Item = { ex: Exercise; key: number };

function LessonRound({
  cards,
  isoCode,
  onAgain,
}: {
  cards: DictionaryEntry[];
  isoCode?: string | null;
  onAgain: () => void;
}) {
  const iso = isoCode || "_";
  const [prog, setProg] = useState<LearnProgress>(() => load(iso));
  // Mirror of `prog` for synchronous reads inside the answer handler, so we
  // never have to compute new XP/boxes from a setState updater (which React
  // may run twice in StrictMode).
  const progRef = useRef(prog);
  const bumpedRef = useRef(false);
  const comboRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [sessionXp, setSessionXp] = useState(0);
  const [gainFlash, setGainFlash] = useState<number | null>(null);

  // Build the lesson once, ordering by spaced repetition (due/weak first).
  const lesson = useMemo<Item[]>(() => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const today = dayIndex();
    const ordered = sortForStudy(
      cards.map((c) => c.id),
      prog.cards,
      today,
    )
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    return buildLesson(ordered, cards, LESSON_SIZE).map((ex, i) => ({
      ex,
      key: i,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [queue, setQueue] = useState<Item[]>(lesson);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const total = lesson.length;
  const current = queue[0] ?? null;

  const onDone = useCallback(
    (correct: boolean) => {
      const item = queue[0];
      if (!item) return;
      const entry = item.ex.entry;
      const today = dayIndex();
      const prev = progRef.current;
      const p: LearnProgress = { ...prev, cards: { ...prev.cards } };

      // First answer of the lesson counts the study day toward the streak.
      if (!bumpedRef.current) {
        bumpedRef.current = true;
        p.streak = bumpStreak(p, today);
        p.lastDay = today;
        if (p.goalDay !== today) {
          p.goalDay = today;
          p.goalCount = 0;
        }
      }

      const ns = nextState(prev.cards[entry.id], correct, today);
      p.cards[entry.id] = ns;

      if (correct) {
        const gained = xpFor(ns.box, comboRef.current);
        p.xp = prev.xp + gained;
        p.bestCombo = Math.max(p.bestCombo, comboRef.current + 1);
        p.goalCount = Math.min(DAILY_GOAL, p.goalCount + 1);
        comboRef.current += 1;
        setCombo(comboRef.current);
        setSessionXp((x) => x + gained);
        setGainFlash(gained);
        setSolved((s) => new Set(s).add(item.key));
        setQueue((q) => q.slice(1));
      } else {
        comboRef.current = 0;
        setCombo(0);
        setHearts((h) => h - 1);
        // Send the card to the back of the queue for another attempt.
        setQueue((q) => [...q.slice(1), item]);
      }

      progRef.current = p;
      save(iso, p);
      setProg(p);
    },
    [queue, iso],
  );

  // Clear the floating "+XP" badge shortly after it appears.
  useEffect(() => {
    if (gainFlash === null) return;
    const t = setTimeout(() => setGainFlash(null), 900);
    return () => clearTimeout(t);
  }, [gainFlash]);

  const lvl = levelInfo(prog.xp);
  const finished = hearts <= 0 || !current;

  if (finished) {
    const accuracy =
      solved.size + (MAX_HEARTS - hearts) > 0
        ? Math.round(
            (solved.size / (solved.size + (MAX_HEARTS - hearts))) * 100,
          )
        : 100;
    const cleared = solved.size >= total && total > 0;
    return (
      <Summary
        cleared={cleared}
        outOfHearts={hearts <= 0}
        solved={solved.size}
        total={total}
        sessionXp={sessionXp}
        accuracy={accuracy}
        streak={prog.streak}
        bestCombo={prog.bestCombo}
        goalCount={prog.goalCount}
        mastered={masteredCount(prog.cards)}
        deckSize={cards.length}
        level={lvl.level}
        onAgain={onAgain}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Game HUD ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${(solved.size / total) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <HeartIcon
                key={i}
                width={16}
                height={16}
                aria-hidden
                className={i < hearts ? "text-primary" : "text-border"}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="font-semibold text-primary">Ур. {lvl.level}</span>
            <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-surface-2 align-middle">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.round(lvl.pct * 100)}%` }}
              />
            </span>
          </span>
          <span className="flex items-center gap-3">
            {combo >= 2 && (
              <span className="font-semibold text-[#d9663b]">
                🔥 {combo} · ×{comboMult(combo).toFixed(2)}
              </span>
            )}
            <span className="relative font-medium text-accent">
              {sessionXp} XP
              {gainFlash !== null && (
                <span className="animate-fade-up absolute -top-4 right-0 text-[#d9a066]">
                  +{gainFlash}
                </span>
              )}
            </span>
          </span>
        </div>
      </div>

      {/* ── Current exercise ── */}
      <ExerciseView
        key={`${current.key}-${queue.length}`}
        ex={current.ex}
        isoCode={isoCode}
        onDone={onDone}
      />
    </div>
  );
}

/* ──────────────────────────── Exercise views ─────────────────────────────*/

type Status = "idle" | "correct" | "wrong";

function ExerciseView({
  ex,
  isoCode,
  onDone,
}: {
  ex: Exercise;
  isoCode?: string | null;
  onDone: (correct: boolean) => void;
}) {
  switch (ex.kind) {
    case "choose-translation":
    case "choose-term":
      return <ChoiceView ex={ex} isoCode={isoCode} onDone={onDone} />;
    case "fill-blank":
      return <FillBlankView ex={ex} isoCode={isoCode} onDone={onDone} />;
    case "assemble-sentence":
      return <AssembleView ex={ex} isoCode={isoCode} onDone={onDone} />;
    case "scramble":
      return <ScrambleView ex={ex} isoCode={isoCode} onDone={onDone} />;
  }
}

/** Shared footer: a Check button that turns into a correct/wrong banner. */
function CheckFooter({
  status,
  canCheck,
  answerText,
  isoCode,
  speakAnswer,
  onCheck,
  onContinue,
}: {
  status: Status;
  canCheck: boolean;
  answerText: string;
  isoCode?: string | null;
  speakAnswer?: boolean;
  onCheck: () => void;
  onContinue: () => void;
}) {
  if (status === "idle") {
    return (
      <button
        onClick={onCheck}
        disabled={!canCheck}
        className="pressable w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Проверить
      </button>
    );
  }
  const ok = status === "correct";
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl p-4 ${
        ok ? "bg-accent/10" : "bg-primary/10"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            ok ? "bg-accent text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {ok ? (
            <CheckIcon width={16} height={16} aria-hidden />
          ) : (
            <XIcon width={16} height={16} aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              ok ? "text-accent" : "text-primary"
            }`}
          >
            {ok ? "Верно!" : "Правильный ответ:"}
          </p>
          {!ok && (
            <p className="flex items-center gap-1.5 text-base text-foreground">
              {answerText}
              {speakAnswer && (
                <SpeakButton text={answerText} isoCode={isoCode} />
              )}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onContinue}
        className={`pressable w-full rounded-xl px-4 py-3 text-base font-medium text-white ${
          ok ? "bg-accent" : "bg-primary"
        }`}
      >
        Продолжить
      </button>
    </div>
  );
}

function PromptCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card flex min-h-[8rem] flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}

/* ── Pick the matching option (term↔translation) ── */
function ChoiceView({
  ex,
  isoCode,
  onDone,
}: {
  ex: Extract<Exercise, { kind: "choose-translation" | "choose-term" }>;
  isoCode?: string | null;
  onDone: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const answerIsTerm = ex.kind === "choose-term";

  return (
    <div className="flex flex-col gap-4">
      <PromptCard>
        <p className="text-sm text-muted">
          {answerIsTerm ? "Как сказать на изучаемом языке?" : "Что это значит?"}
        </p>
        <p
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {ex.prompt}
        </p>
      </PromptCard>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ex.options.map((opt) => {
          const isAnswer = opt === ex.answer;
          const isPicked = opt === picked;
          let cls =
            "border-border bg-surface text-foreground hover:bg-surface-2";
          if (status !== "idle") {
            if (isAnswer) cls = "border-accent bg-accent/10 text-accent";
            else if (isPicked) cls = "border-primary bg-primary/10 text-primary";
            else cls = "border-border bg-surface text-muted opacity-60";
          } else if (isPicked) {
            cls = "border-primary bg-primary/5 text-foreground";
          }
          return (
            <button
              key={opt}
              disabled={status !== "idle"}
              onClick={() => setPicked(opt)}
              className={`pressable rounded-2xl border px-4 py-3 text-left text-base transition-colors ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <CheckFooter
        status={status}
        canCheck={picked !== null}
        answerText={ex.answer}
        isoCode={isoCode}
        speakAnswer={answerIsTerm}
        onCheck={() => setStatus(picked === ex.answer ? "correct" : "wrong")}
        onContinue={() => onDone(status === "correct")}
      />
    </div>
  );
}

/* ── Fill the blank in an example sentence from a word bank ── */
function FillBlankView({
  ex,
  isoCode,
  onDone,
}: {
  ex: Extract<Exercise, { kind: "fill-blank" }>;
  isoCode?: string | null;
  onDone: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const correct = picked != null && picked.toLowerCase() === ex.entry.term.toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <PromptCard>
        {ex.hint && (
          <p className="text-sm text-muted">«{ex.hint}»</p>
        )}
        <p className="text-xl leading-relaxed text-foreground">
          {ex.before}{" "}
          <span
            className={`mx-0.5 inline-block min-w-[4rem] rounded-lg border-b-2 px-2 align-middle ${
              picked
                ? "border-primary text-foreground"
                : "border-dashed border-muted text-transparent"
            }`}
          >
            {picked ?? "…"}
          </span>{" "}
          {ex.after}
        </p>
      </PromptCard>

      <div className="flex flex-wrap justify-center gap-2">
        {ex.options.map((opt) => (
          <button
            key={opt}
            disabled={status !== "idle"}
            onClick={() => setPicked(opt)}
            className={`pressable rounded-xl border px-4 py-2.5 text-base ${
              picked === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground hover:bg-surface-2"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <CheckFooter
        status={status}
        canCheck={picked !== null}
        answerText={ex.answer}
        isoCode={isoCode}
        speakAnswer
        onCheck={() => setStatus(correct ? "correct" : "wrong")}
        onContinue={() => onDone(status === "correct")}
      />
    </div>
  );
}

/* ── Tap tiles to (re)build the sentence in order ── */
function AssembleView({
  ex,
  isoCode,
  onDone,
}: {
  ex: Extract<Exercise, { kind: "assemble-sentence" }>;
  isoCode?: string | null;
  onDone: (correct: boolean) => void;
}) {
  // Tiles carry an index so duplicate words stay individually addressable.
  const initial = useMemo(
    () => ex.tiles.map((t, i) => ({ t, i })),
    [ex.tiles],
  );
  const [bank, setBank] = useState(initial);
  const [built, setBuilt] = useState<{ t: string; i: number }[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const move = (tile: { t: string; i: number }, toBuilt: boolean) => {
    if (status !== "idle") return;
    if (toBuilt) {
      setBank((b) => b.filter((x) => x.i !== tile.i));
      setBuilt((b) => [...b, tile]);
    } else {
      setBuilt((b) => b.filter((x) => x.i !== tile.i));
      setBank((b) => [...b, tile]);
    }
  };

  const correct = built.map((x) => x.t).join(" ") === ex.answer.join(" ");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted">
        Соберите предложение из слов{ex.hint ? ` · «${ex.hint}»` : ""}
      </p>

      {/* Build area */}
      <div className="card flex min-h-[5rem] flex-wrap content-start gap-2 p-4">
        {built.length === 0 && (
          <span className="text-sm text-muted">Нажимайте слова ниже…</span>
        )}
        {built.map((tile) => (
          <button
            key={tile.i}
            disabled={status !== "idle"}
            onClick={() => move(tile, false)}
            className="pressable rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-base text-primary"
          >
            {tile.t}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-4">
        {bank.map((tile) => (
          <button
            key={tile.i}
            disabled={status !== "idle"}
            onClick={() => move(tile, true)}
            className="pressable rounded-lg border border-border bg-surface px-3 py-1.5 text-base text-foreground hover:bg-surface-2"
          >
            {tile.t}
          </button>
        ))}
        {bank.length === 0 && (
          <span className="text-sm text-muted">— все слова использованы —</span>
        )}
      </div>

      <CheckFooter
        status={status}
        canCheck={built.length > 0}
        answerText={ex.answer.join(" ")}
        isoCode={isoCode}
        speakAnswer
        onCheck={() => setStatus(correct ? "correct" : "wrong")}
        onContinue={() => onDone(status === "correct")}
      />
    </div>
  );
}

/* ── Tap letters to spell the term ── */
function ScrambleView({
  ex,
  isoCode,
  onDone,
}: {
  ex: Extract<Exercise, { kind: "scramble" }>;
  isoCode?: string | null;
  onDone: (correct: boolean) => void;
}) {
  const initial = useMemo(
    () => ex.letters.map((t, i) => ({ t, i })),
    [ex.letters],
  );
  const [bank, setBank] = useState(initial);
  const [built, setBuilt] = useState<{ t: string; i: number }[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const move = (tile: { t: string; i: number }, toBuilt: boolean) => {
    if (status !== "idle") return;
    if (toBuilt) {
      setBank((b) => b.filter((x) => x.i !== tile.i));
      setBuilt((b) => [...b, tile]);
    } else {
      setBuilt((b) => b.filter((x) => x.i !== tile.i));
      setBank((b) => [...b, tile]);
    }
  };

  const correct = built.map((x) => x.t).join("") === ex.answer;

  return (
    <div className="flex flex-col gap-4">
      <PromptCard>
        <p className="text-sm text-muted">Соберите слово</p>
        {ex.hint && <p className="text-lg text-foreground">«{ex.hint}»</p>}
        <div className="flex min-h-[2.5rem] flex-wrap justify-center gap-1.5">
          {built.length === 0 && (
            <span className="text-sm text-muted">выберите буквы…</span>
          )}
          {built.map((tile) => (
            <button
              key={tile.i}
              disabled={status !== "idle"}
              onClick={() => move(tile, false)}
              className="pressable h-10 w-9 rounded-lg border border-primary bg-primary/10 text-lg text-primary"
            >
              {tile.t}
            </button>
          ))}
        </div>
      </PromptCard>

      <div className="flex flex-wrap justify-center gap-1.5">
        {bank.map((tile) => (
          <button
            key={tile.i}
            disabled={status !== "idle"}
            onClick={() => move(tile, true)}
            className="pressable h-11 w-10 rounded-lg border border-border bg-surface text-lg text-foreground hover:bg-surface-2"
          >
            {tile.t}
          </button>
        ))}
      </div>

      <CheckFooter
        status={status}
        canCheck={built.length > 0}
        answerText={ex.answer}
        isoCode={isoCode}
        speakAnswer
        onCheck={() => setStatus(correct ? "correct" : "wrong")}
        onContinue={() => onDone(status === "correct")}
      />
    </div>
  );
}

/* ──────────────────────────── Lesson summary ─────────────────────────────*/

function Summary({
  cleared,
  outOfHearts,
  solved,
  total,
  sessionXp,
  accuracy,
  streak,
  bestCombo,
  goalCount,
  mastered,
  deckSize,
  level,
  onAgain,
}: {
  cleared: boolean;
  outOfHearts: boolean;
  solved: number;
  total: number;
  sessionXp: number;
  accuracy: number;
  streak: number;
  bestCombo: number;
  goalCount: number;
  mastered: number;
  deckSize: number;
  level: number;
  onAgain: () => void;
}) {
  const goalPct = Math.min(1, goalCount / DAILY_GOAL);
  const r = 30;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card flex flex-col items-center gap-5 p-7 text-center">
      <div className="flex flex-col items-center gap-2">
        {cleared ? (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <CheckIcon width={30} height={30} aria-hidden />
          </span>
        ) : (
          <span className="text-4xl">💪</span>
        )}
        <p
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {cleared ? "Урок пройден!" : outOfHearts ? "Сердечки кончились" : "Готово"}
        </p>
        <p className="text-sm text-muted">
          {solved} из {total} верно · точность {accuracy}%
        </p>
      </div>

      {/* Daily goal ring */}
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            strokeWidth="7"
            className="stroke-surface-2"
          />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-accent transition-all duration-500"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - goalPct)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold text-foreground">
            {Math.min(goalCount, DAILY_GOAL)}/{DAILY_GOAL}
          </span>
          <span className="text-[10px] text-muted">цель дня</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Опыт за урок" value={`+${sessionXp}`} accent />
        <Stat label="Уровень" value={`${level}`} />
        <Stat label="Серия дней" value={`🔥 ${streak}`} />
        <Stat label="Лучшее комбо" value={`${bestCombo}`} />
        <Stat
          label="Освоено слов"
          value={`${mastered} / ${deckSize}`}
          span
        />
      </div>

      <button
        onClick={onAgain}
        className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground"
      >
        <RepeatIcon width={18} height={18} aria-hidden /> Ещё урок
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  span,
}: {
  label: string;
  value: string;
  accent?: boolean;
  span?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-surface-2 px-4 py-3 ${span ? "col-span-2" : ""}`}
    >
      <p
        className={`text-xl font-semibold ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
