/**
 * Per-language grammar primers injected into the chat system prompt.
 *
 * For low-resource languages the model has seen little or no text, so a
 * compact typological cheat-sheet (morphology, word order, key paradigms,
 * stock phrases) measurably improves generation quality. Keyed by ISO 639-3.
 */

export const GRAMMAR_NOTES: Record<string, string> = {
  // Southern Altai (алтай-кижи)
  alt: [
    "Southern Altai (алтай тили) grammar primer:",
    "- Turkic, agglutinative, strict SOV word order (verb last).",
    "- Cyrillic script with extra letters: ӧ, ӱ, ј, ҥ.",
    "- Vowel harmony: suffixes alternate front/back and rounded/unrounded",
    "  (e.g. -лар/-лер/-дор/-дӧр plural).",
    "- No grammatical gender, no articles.",
    "- Cases: NOM —, GEN -ныҥ/-ниҥ/-дыҥ/-диҥ/-тыҥ/-тиҥ, DAT -га/-ге/-ка/-ке,",
    "  ACC -ны/-ни/-ды/-ди/-ты/-ти, LOC -да/-де/-та/-те, ABL -даҥ/-деҥ/-таҥ/-теҥ.",
    "- Possession via suffixes: -ым/-им (my), -ыҥ/-иҥ (your), -ы/-и (his/her).",
    "- Verb negation with -ба-/-бе-/-по- infix; nominal negation with эмес.",
    "- Question particle ба/бе/по/пӧ at the end: Сен барарыҥ ба? (Ты пойдёшь?)",
    "- Past tense -ды/-ди/-ты/-ти, future/aorist -ар/-ер, imperative = bare stem.",
    "- Pronouns: мен, сен, ол, бис, слер, олор.",
    "- Stock phrases: Эзен! (здравствуй), Јакшы ба? (как дела?), Быйан (спасибо),",
    "  Јакшы (хорошо), Эйе (да), Јок (нет).",
  ].join("\n"),
};

/** Primer for a language, or empty string when none is curated yet. */
export function grammarNotes(isoCode: string | null | undefined): string {
  return (isoCode && GRAMMAR_NOTES[isoCode]) || "";
}
