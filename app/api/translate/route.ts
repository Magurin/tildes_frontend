import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateChat, geminiEnabled } from "@/lib/gemini";
import { retrieveContext } from "@/lib/rag";
import { grammarNotes } from "@/lib/grammar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Inference backend with the project's own NLLB+LoRA translator. */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
/** Languages whose translations go through the own model first. */
const NMT_LANGS = new Set(["alt"]);

/**
 * POST {language_id, text, direction} — translate between Russian and the
 * target language, grounded in the dictionary, grammar notes and corpus.
 *
 * direction: "ru2t" (Russian → target) | "t2ru" (target → Russian).
 * Returns {translation} only — no commentary, for a translator-style UI.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const languageId = body?.language_id as string | undefined;
  const text = (body?.text as string | undefined)?.trim();
  const direction = body?.direction === "t2ru" ? "t2ru" : "ru2t";

  if (!languageId || !text)
    return NextResponse.json(
      { error: "language_id and text required" },
      { status: 400 },
    );
  if (!geminiEnabled())
    return NextResponse.json({ error: "Gemini is not configured" }, { status: 503 });

  const supabase = getSupabaseServer();

  // Words from the input, used to pull matching dictionary entries. When
  // translating from Russian we match the gloss (translation column); from
  // the target language we match the headword (term column).
  const words = [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2),
    ),
  ].slice(0, 12);
  const col = direction === "ru2t" ? "translation" : "term";
  const orFilter = words.map((w) => `${col}.ilike.%${w}%`).join(",");

  const [{ data: language }, ragChunks, { data: dict }] = await Promise.all([
    supabase.from("languages").select("name, native_name, iso_code").eq("id", languageId).single(),
    retrieveContext(languageId, text),
    orFilter
      ? supabase
          .from("dictionary_entries")
          .select("term, translation")
          .eq("language_id", languageId)
          .or(orFilter)
          .limit(40)
      : Promise.resolve({ data: [] as { term: string; translation: string | null }[] }),
  ]);

  // Own fine-tuned NLLB first for supported languages; Gemini+RAG is the
  // fallback when the backend is cold, down, or not configured.
  if (BACKEND_URL && NMT_LANGS.has(language?.iso_code ?? "")) {
    try {
      const res = await fetch(`${BACKEND_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          direction,
          iso_code: language?.iso_code,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.translation?.trim())
          return NextResponse.json({
            translation: json.translation.trim(),
            model: json.model,
            usedContext: 0,
          });
      }
    } catch (e) {
      console.error("Own NMT failed, falling back to Gemini:", e);
    }
  }

  const name = language?.name ?? "целевой";
  const dictLines = (dict ?? [])
    .filter((d) => d.translation)
    .map((d) => `- ${d.term} = ${d.translation}`)
    .join("\n");
  const grammar = grammarNotes(language?.iso_code);

  const [from, to] =
    direction === "ru2t" ? ["русского", name] : [name, "русский"];

  const system = [
    `Ты — переводчик с ${from} на ${to} язык.`,
    "Переведи текст пользователя. Выведи ТОЛЬКО перевод — без пояснений,",
    "без кавычек, без транскрипции, без вариантов.",
    "НЕ добавляй приветствий («Изен», «Эзен» и т.п.), обращений или любых",
    "слов, которых нет во вводе пользователя. Переводи ровно то, что введено.",
    "Если части фразы нет в словаре, переведи по грамматическим правилам",
    "ниже, опираясь на словарь и примеры. Слово, которое нельзя построить,",
    "оставь как есть.",
    "Грамматические правила ниже — только для построения форм; стоковые",
    "фразы и приветствия из них НЕ вставляй, если их нет во вводе.",
    "",
    grammar,
    "",
    dictLines ? `Словарь (term = перевод):\n${dictLines}` : "",
    "",
    ragChunks.length
      ? `Примеры параллельных фраз и материалов:\n${ragChunks.join("\n---\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let translation: string;
  try {
    translation = (await generateChat(system, [{ role: "user", text }])).trim();
  } catch (e) {
    console.error("Translate error:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }

  if (!translation)
    return NextResponse.json({ error: "Empty translation" }, { status: 502 });

  return NextResponse.json({ translation, usedContext: ragChunks.length });
}
