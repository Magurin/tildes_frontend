/**
 * Gamification + spaced-repetition state for the Learn page.
 *
 * All progress lives in localStorage, namespaced per language ISO code, so a
 * learner keeps their streak, XP and per-word mastery across sessions without
 * any backend. Pure helpers here; the React layer in `page.tsx` consumes them.
 */

/** Leitner boxes 0..5 → days until a card is due again once answered right. */
const LEITNER_DAYS = [0, 1, 2, 4, 8, 16] as const;
export const MAX_BOX = LEITNER_DAYS.length - 1;

/** A word is "mastered" once it reaches the last box. */
export const MASTER_BOX = MAX_BOX;

/** Cards to study to close the daily goal ring. */
export const DAILY_GOAL = 20;

export type CardState = {
  /** Leitner box, 0 (new/forgotten) .. MAX_BOX (mastered). */
  box: number;
  /** Day-index after which the card is due again. */
  due: number;
};

export type LearnProgress = {
  /** Per-word state, keyed by dictionary entry id. */
  cards: Record<string, CardState>;
  xp: number;
  /** Consecutive calendar days studied. */
  streak: number;
  /** Day-index of the last study session (for streak math). */
  lastDay: number;
  bestCombo: number;
  /** Cards reviewed during `goalDay`, for the daily goal ring. */
  goalDay: number;
  goalCount: number;
};

const VERSION = 1;
const keyFor = (iso: string) => `tildes:learn:v${VERSION}:${iso}`;

/** UTC day-index — stable, monotonic, good enough for streak + scheduling. */
export function dayIndex(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

function empty(): LearnProgress {
  return {
    cards: {},
    xp: 0,
    streak: 0,
    lastDay: 0,
    bestCombo: 0,
    goalDay: 0,
    goalCount: 0,
  };
}

export function load(iso: string): LearnProgress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(keyFor(iso));
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as Partial<LearnProgress>) };
  } catch {
    return empty();
  }
}

export function save(iso: string, p: LearnProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(iso), JSON.stringify(p));
  } catch {
    /* quota / private mode — progress just won't persist, no crash. */
  }
}

/* ─── XP & levels ─────────────────────────────────────────────────────────
 * Level N needs 50·N XP to clear, so thresholds grow 50,100,150… and the
 * curve stays readable. levelInfo() returns everything the bar needs. */

export function levelInfo(xp: number): {
  level: number;
  inLevel: number;
  needed: number;
  pct: number;
} {
  let level = 1;
  let remaining = xp;
  let needed = 50;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = level * 50;
  }
  return { level, inLevel: remaining, needed, pct: remaining / needed };
}

/** XP awarded for a correct answer, scaled by box reached and combo. */
export function xpFor(box: number, combo: number): number {
  const base = 6 + box * 2; // deeper mastery is worth more
  const mult = 1 + Math.min(combo, 8) * 0.25; // caps the combo bonus at ×3
  return Math.round(base * mult);
}

/** Combo multiplier shown in the UI (mirrors xpFor's cap). */
export function comboMult(combo: number): number {
  return 1 + Math.min(combo, 8) * 0.25;
}

/* ─── Scheduling ──────────────────────────────────────────────────────────*/

export function isDue(state: CardState | undefined, today: number): boolean {
  return !state || state.due <= today;
}

/**
 * Order a deck for study: due cards first (lowest box = weakest first), then
 * brand-new cards, then everything else. Caller has already shuffled within.
 */
export function sortForStudy(
  ids: string[],
  cards: Record<string, CardState>,
  today: number,
): string[] {
  const rank = (id: string) => {
    const s = cards[id];
    if (!s) return 1; // new card — study after overdue, before not-due
    if (s.due <= today) return 0 + s.box * 0.01; // due; weaker first
    return 2 + s.box * 0.01; // not due yet
  };
  return [...ids].sort((a, b) => rank(a) - rank(b));
}

/** Apply an answer to a card's box/due and return the new state. */
export function nextState(
  prev: CardState | undefined,
  known: boolean,
  today: number,
): CardState {
  const box = known ? Math.min((prev?.box ?? 0) + 1, MAX_BOX) : 0;
  return { box, due: today + LEITNER_DAYS[box] };
}

/** Update streak for "studied today"; returns the new streak value. */
export function bumpStreak(p: LearnProgress, today: number): number {
  if (p.lastDay === today) return p.streak; // already counted today
  if (p.lastDay === today - 1) return p.streak + 1; // consecutive day
  return 1; // first day, or streak broken
}

/** How many distinct words have reached the master box. */
export function masteredCount(cards: Record<string, CardState>): number {
  let n = 0;
  for (const id in cards) if (cards[id].box >= MASTER_BOX) n += 1;
  return n;
}
