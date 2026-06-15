/**
 * Exercise generator for the Learn lesson — Duolingo-style drills built from
 * whatever each dictionary entry happens to carry (translation, example
 * sentence, the term itself). Pure & deterministic given its inputs except for
 * the shuffles, so it's easy to reason about and test.
 *
 * Every entry is inspected and the engine emits the hardest exercise the data
 * can support, falling back gracefully when there's no example sentence.
 */

import type { DictionaryEntry, SentencePair } from "@/lib/types";

export type Exercise =
  // Show one side, pick the other from four options.
  | {
      kind: "choose-translation";
      entry: DictionaryEntry;
      prompt: string; // the term (target language)
      answer: string; // its translation (Russian)
      options: string[];
    }
  | {
      kind: "choose-term";
      entry: DictionaryEntry;
      prompt: string; // the translation (Russian)
      answer: string; // the term (target language)
      options: string[];
    }
  // Example sentence with the term blanked; tap the right word from a bank.
  | {
      kind: "fill-blank";
      entry: DictionaryEntry;
      before: string;
      after: string;
      answer: string;
      options: string[];
      hint: string | null; // the translation, as a nudge
    }
  // Rebuild the example sentence by tapping word tiles in order.
  | {
      kind: "assemble-sentence";
      entry: DictionaryEntry;
      answer: string[]; // tokens in correct order
      tiles: string[]; // shuffled tokens (+ a distractor or two)
      hint: string | null;
    }
  // Spell the term by tapping letter tiles in order.
  | {
      kind: "scramble";
      entry: DictionaryEntry;
      answer: string; // the term
      letters: string[]; // shuffled letters
      hint: string; // the translation / definition
    }
  // Translate a Russian sentence by tapping target-language word tiles in order.
  | {
      kind: "translate-sentence";
      pair: SentencePair;
      prompt: string; // the Russian sentence
      answer: string[]; // target tokens in correct order
      tiles: string[]; // shuffled answer tokens (+ a couple distractors)
    };

export type ExerciseKind = Exercise["kind"];

/** Stable spaced-repetition key for any exercise (entry id or pair id). */
export function srsKey(ex: Exercise): string {
  return ex.kind === "translate-sentence" ? ex.pair.id : ex.entry.id;
}

/** Text to read aloud / show as the correct answer for an exercise. */
export function answerText(ex: Exercise): string {
  switch (ex.kind) {
    case "assemble-sentence":
      return ex.answer.join(" ");
    case "translate-sentence":
      return ex.answer.join(" ");
    default:
      return ex.answer;
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Normalize for cognate detection: drop stress marks, unify ё, strip edge
 * punctuation — so «поэ́т.» and «поэт» compare equal. */
function normCognate(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents (stress marks)
    .replace(/ё/g, "е")
    .replace(/^[«"'([]+|[.,;:!?»"')\]]+$/g, "")
    .trim();
}

/** Bounded Levenshtein — returns the distance, capped at `max`+1. */
function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
      if (prev[j] < rowMin) rowMin = prev[j];
    }
    if (rowMin > max) return max + 1; // whole row already over budget
  }
  return prev[b.length];
}

/**
 * A "cognate" here is a borrowed word whose term is identical (or all-but-
 * identical) to its translation — e.g. ракета→ракета, поэт→поэт. They teach
 * nothing about the target language, so the lesson filters them out. Multi-gloss
 * translations match if the term echoes ANY gloss.
 */
export function isCognate(
  term: string,
  translation: string | null | undefined,
): boolean {
  if (!translation) return false;
  const t = normCognate(term);
  if (t.length < 2) return false;
  for (const raw of translation.split(/[,;/]|\bили\b/)) {
    const g = normCognate(raw);
    if (!g) continue;
    if (g === t) return true;
    if (t.length >= 4 && g.length >= 4 && editDistance(t, g, 1) <= 1)
      return true;
  }
  return false;
}

/** Words in a sentence (keeps it simple: split on whitespace). */
function words(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

/** True when the example is a usable, multi-word sentence containing the term. */
function exampleHasTerm(entry: DictionaryEntry): boolean {
  if (!entry.example) return false;
  const ws = words(entry.example);
  if (ws.length < 2) return false;
  const term = norm(entry.term);
  return ws.some((w) => norm(w.replace(/[.,!?;:()«»"]/g, "")) === term);
}

/** Which exercise kinds can this entry support, given the deck around it? */
function eligibleKinds(
  entry: DictionaryEntry,
  hasTranslationPool: boolean,
): ExerciseKind[] {
  const kinds: ExerciseKind[] = [];
  if (entry.translation && hasTranslationPool) {
    kinds.push("choose-translation", "choose-term");
  }
  if (exampleHasTerm(entry)) kinds.push("fill-blank");
  if (entry.example && words(entry.example).length >= 3) {
    kinds.push("assemble-sentence");
  }
  const t = entry.term.trim();
  if (t.length >= 3 && t.length <= 16 && !/\s/.test(t)) kinds.push("scramble");
  return kinds;
}

function distractorTranslations(
  answer: string,
  pool: DictionaryEntry[],
  n: number,
): string[] {
  const seen = new Set([norm(answer)]);
  const out: string[] = [];
  for (const e of shuffle(pool)) {
    if (!e.translation) continue;
    const key = norm(e.translation);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e.translation);
    if (out.length >= n) break;
  }
  return out;
}

function distractorTerms(
  answer: string,
  pool: DictionaryEntry[],
  n: number,
): string[] {
  const seen = new Set([norm(answer)]);
  const out: string[] = [];
  for (const e of shuffle(pool)) {
    const key = norm(e.term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e.term);
    if (out.length >= n) break;
  }
  return out;
}

function buildOne(
  entry: DictionaryEntry,
  kind: ExerciseKind,
  pool: DictionaryEntry[],
): Exercise | null {
  switch (kind) {
    case "choose-translation": {
      if (!entry.translation) return null;
      const options = shuffle([
        entry.translation,
        ...distractorTranslations(entry.translation, pool, 3),
      ]);
      if (options.length < 2) return null;
      return {
        kind,
        entry,
        prompt: entry.term,
        answer: entry.translation,
        options,
      };
    }
    case "choose-term": {
      if (!entry.translation) return null;
      const options = shuffle([
        entry.term,
        ...distractorTerms(entry.term, pool, 3),
      ]);
      if (options.length < 2) return null;
      return {
        kind,
        entry,
        prompt: entry.translation,
        answer: entry.term,
        options,
      };
    }
    case "fill-blank": {
      if (!entry.example) return null;
      const ws = words(entry.example);
      const term = norm(entry.term);
      const idx = ws.findIndex(
        (w) => norm(w.replace(/[.,!?;:()«»"]/g, "")) === term,
      );
      if (idx === -1) return null;
      const options = shuffle([
        entry.term,
        ...distractorTerms(entry.term, pool, 3),
      ]);
      return {
        kind,
        entry,
        before: ws.slice(0, idx).join(" "),
        after: ws.slice(idx + 1).join(" "),
        answer: ws[idx], // keep original casing/punctuation
        options: options.length >= 2 ? options : [entry.term],
        hint: entry.translation,
      };
    }
    case "assemble-sentence": {
      if (!entry.example) return null;
      const answer = words(entry.example);
      if (answer.length < 3) return null;
      // One extra word from elsewhere makes the bank less trivially solvable.
      const extra = distractorTerms(entry.term, pool, 1);
      const tiles = shuffle([...answer, ...extra]);
      return { kind, entry, answer, tiles, hint: entry.translation };
    }
    case "scramble": {
      const term = entry.term.trim();
      let letters = shuffle([...term]);
      // Avoid handing back the already-correct order.
      if (letters.join("") === term && term.length > 1) {
        letters = [letters[1], letters[0], ...letters.slice(2)];
      }
      return {
        kind,
        entry,
        answer: term,
        letters,
        hint: entry.translation || entry.definition || "",
      };
    }
    default:
      // Sentence exercises are built separately, never via buildOne.
      return null;
  }
}

/** Tokenize a sentence into clean, lowercased, punctuation-free words. */
function sentenceTokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:()«»"]/g, ""))
    .filter(Boolean);
}

/**
 * Turn sentence pairs into "translate the sentence" exercises. Each answer is
 * the tokenized target; the word bank adds a couple of decoy words pulled from
 * other sentences so the tiles aren't a trivial 1:1 set.
 */
export function buildSentenceExercises(
  pairs: SentencePair[],
  max: number,
): Exercise[] {
  // Flat pool of candidate decoy words from the whole batch.
  const wordPool = Array.from(
    new Set(pairs.flatMap((p) => sentenceTokens(p.target))),
  );
  const out: Exercise[] = [];
  for (const pair of pairs) {
    if (out.length >= max) break;
    const answer = sentenceTokens(pair.target);
    if (answer.length < 3 || answer.length > 9) continue;
    const inAnswer = new Set(answer);
    const decoys = shuffle(wordPool.filter((w) => !inAnswer.has(w))).slice(
      0,
      answer.length >= 6 ? 2 : 1,
    );
    out.push({
      kind: "translate-sentence",
      pair,
      prompt: pair.source,
      answer,
      tiles: shuffle([...answer, ...decoys]),
    });
  }
  return out;
}

/**
 * Build a lesson: pick `size` cards (caller pre-orders by spaced repetition),
 * and turn each into the most engaging exercise its data allows. Consecutive
 * exercises avoid repeating the same kind so a lesson feels varied.
 */
export function buildLesson(
  ordered: DictionaryEntry[],
  pool: DictionaryEntry[],
  size: number,
): Exercise[] {
  const hasTranslationPool =
    pool.filter((e) => e.translation).length >= 4;
  const out: Exercise[] = [];
  let lastKind: ExerciseKind | null = null;

  for (const entry of ordered) {
    if (out.length >= size) break;
    const kinds = eligibleKinds(entry, hasTranslationPool);
    if (kinds.length === 0) continue;
    // Prefer a kind different from the previous exercise for variety.
    const fresh = kinds.filter((k) => k !== lastKind);
    const choices = fresh.length ? fresh : kinds;
    let ex: Exercise | null = null;
    for (const k of shuffle(choices)) {
      ex = buildOne(entry, k, pool);
      if (ex) break;
    }
    if (ex) {
      out.push(ex);
      lastKind = ex.kind;
    }
  }
  return out;
}
