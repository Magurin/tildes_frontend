import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateChat, geminiEnabled } from "@/lib/gemini";
import { retrieveContext } from "@/lib/rag";
import { grammarNotes } from "@/lib/grammar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST {language_id, message} — chat with the language model grounded in
 * uploaded documents (RAG) and the collected quiz dataset for the language.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const languageId = body?.language_id as string | undefined;
  const message = (body?.message as string | undefined)?.trim();

  if (!languageId || !message)
    return NextResponse.json(
      { error: "language_id and message required" },
      { status: 400 },
    );

  if (!geminiEnabled())
    return NextResponse.json(
      { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local." },
      { status: 503 },
    );

  const supabase = getSupabaseServer();

  // Persist the user's message.
  await supabase
    .from("chat_messages")
    .insert({ language_id: languageId, role: "user", content: message });

  // Dictionary lookup keyed to the user's message: search terms and
  // translations for the message's words instead of taking a random sample.
  const queryWords = [
    ...new Set(
      message
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    ),
  ].slice(0, 8);
  const orFilter = queryWords
    .map((w) => `term.ilike.%${w}%,translation.ilike.%${w}%`)
    .join(",");

  // Gather grounding: language meta, RAG chunks, dictionary, history.
  const [
    { data: language },
    ragChunks,
    { data: relevantDict },
    { data: sampleDict },
    { data: history },
  ] = await Promise.all([
    supabase.from("languages").select("*").eq("id", languageId).single(),
    retrieveContext(languageId, message),
    orFilter
      ? supabase
          .from("dictionary_entries")
          .select("term, translation, definition, example")
          .eq("language_id", languageId)
          .or(orFilter)
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("dictionary_entries")
      .select("term, translation, definition, example")
      .eq("language_id", languageId)
      .limit(20),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("language_id", languageId)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  // Relevant hits first, then samples as filler; dedupe by term.
  const seenTerms = new Set<string>();
  const dictLines = [...(relevantDict ?? []), ...(sampleDict ?? [])]
    .filter((d) => {
      const key = d.term.toLowerCase();
      if (seenTerms.has(key)) return false;
      seenTerms.add(key);
      return true;
    })
    .slice(0, 40)
    .map(
      (d) =>
        `- ${d.term}${d.translation ? ` = ${d.translation}` : ""}${
          d.definition ? ` (${d.definition})` : ""
        }${d.example ? ` [пример: ${d.example}]` : ""}`,
    )
    .join("\n");

  const grammar = grammarNotes(language?.iso_code);

  const system = [
    `You are a language-preservation assistant for the ${
      language?.name ?? "target"
    } language (${language?.native_name ?? ""}).`,
    "Help document, translate, and explain the language. Be accurate and",
    "concise. If you are unsure, say so rather than inventing words.",
    "When the user writes in or asks about the target language, reply with",
    "target-language sentences built strictly from the dictionary entries and",
    "grammar notes below, and add a Russian translation in parentheses.",
    "Prefer dictionary words over invented ones; mark uncertain forms with (?).",
    "",
    grammar,
    "",
    dictLines ? `Known dictionary entries:\n${dictLines}` : "",
    "",
    ragChunks.length
      ? `Relevant excerpts from uploaded materials:\n${ragChunks.join("\n---\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const turns = (history ?? []).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    text: m.content,
  }));

  let reply: string;
  try {
    reply = await generateChat(system, turns);
  } catch (e) {
    console.error("Gemini error:", e);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 502 },
    );
  }

  await supabase
    .from("chat_messages")
    .insert({ language_id: languageId, role: "model", content: reply });

  return NextResponse.json({ reply, usedContext: ragChunks.length });
}
