import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ingestChunks } from "@/lib/rag";
import { geminiEnabled } from "@/lib/gemini";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Embedding a few thousand entries takes a while.
export const maxDuration = 60;

/** Mime marker for the synthetic dictionary-index document. */
const INDEX_MIME = "application/x-dictionary-index";
/** Dictionary lines per RAG chunk. Small chunks keep the embedding focused
 * on a few words, so single-word lookups surface the right entry. */
const LINES_PER_CHUNK = 8;

/**
 * POST — (re)index a language's dictionary into the RAG store.
 *
 * Dictionary glosses may be in a different language than the user's chat
 * messages (e.g. English glosses, Russian questions). Text search misses
 * those, but multilingual embeddings bridge them, so the dictionary is
 * embedded as document chunks under a synthetic document. Idempotent:
 * the previous index for the language is replaced.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireModerator(req);
  if (denied) return denied;

  const { id } = await params;
  if (!geminiEnabled())
    return NextResponse.json(
      { error: "Gemini is not configured" },
      { status: 503 },
    );

  const supabase = getSupabaseServer();

  // Page through: the server caps any single response at 1000 rows.
  type Entry = {
    term: string;
    translation: string | null;
    definition: string | null;
    example: string | null;
  };
  const entries: Entry[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from("dictionary_entries")
      .select("term, translation, definition, example")
      .eq("language_id", id)
      .order("created_at", { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    entries.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  if (!entries?.length)
    return NextResponse.json({ error: "no dictionary entries" }, { status: 400 });

  // Replace any previous index (chunks cascade via document_id FK or are
  // removed explicitly to be safe).
  const { data: oldDocs } = await supabase
    .from("documents")
    .select("id")
    .eq("language_id", id)
    .eq("mime", INDEX_MIME);
  for (const d of oldDocs ?? []) {
    await supabase.from("document_chunks").delete().eq("document_id", d.id);
    await supabase.from("documents").delete().eq("id", d.id);
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      language_id: id,
      filename: "Словарь (автоиндекс для чата)",
      storage_path: "",
      mime: INDEX_MIME,
      status: "processing",
    })
    .select()
    .single();
  if (docErr || !doc)
    return NextResponse.json(
      { error: docErr?.message ?? "insert failed" },
      { status: 500 },
    );

  const lines = entries.map(
    (e) =>
      `${e.term}${e.translation ? ` = ${e.translation}` : ""}${
        e.definition ? ` (${e.definition})` : ""
      }${e.example ? ` [пример: ${e.example}]` : ""}`,
  );
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_CHUNK)
    chunks.push(
      "Словарные статьи:\n" + lines.slice(i, i + LINES_PER_CHUNK).join("\n"),
    );

  let ingested = 0;
  let status = "ready";
  try {
    ingested = await ingestChunks(doc.id, id, chunks);
  } catch (e) {
    status = "embed_failed";
    console.error("Dictionary indexing failed:", e);
  }
  await supabase.from("documents").update({ status }).eq("id", doc.id);

  return NextResponse.json({
    ok: status === "ready",
    entries: entries.length,
    chunks: chunks.length,
    ingested,
    status,
  });
}
