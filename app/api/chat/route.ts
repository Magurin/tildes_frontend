import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateChat, geminiEnabled } from "@/lib/gemini";
import { retrieveContext } from "@/lib/rag";

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

  // Gather grounding: language meta, RAG chunks, sample dictionary terms.
  const [{ data: language }, ragChunks, { data: dict }, { data: history }] =
    await Promise.all([
      supabase.from("languages").select("*").eq("id", languageId).single(),
      retrieveContext(languageId, message),
      supabase
        .from("dictionary_entries")
        .select("term, translation, definition")
        .eq("language_id", languageId)
        .limit(40),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("language_id", languageId)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

  const dictLines = (dict ?? [])
    .map(
      (d) =>
        `- ${d.term}${d.translation ? ` = ${d.translation}` : ""}${
          d.definition ? ` (${d.definition})` : ""
        }`,
    )
    .join("\n");

  const system = [
    `You are a language-preservation assistant for the ${
      language?.name ?? "target"
    } language (${language?.native_name ?? ""}).`,
    "Help document, translate, and explain the language. Be accurate and",
    "concise. If you are unsure, say so rather than inventing words.",
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
