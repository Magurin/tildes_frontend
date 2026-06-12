import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { getSupabaseServer } from "@/lib/supabase/server";
import { chunkText, ingestChunks } from "@/lib/rag";
import { isTabular, parseDictionaryTable } from "@/lib/dictImport";
import { geminiEnabled } from "@/lib/gemini";
import { BUCKETS } from "@/lib/config";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";
// PDF parsing + embeddings can take a while.
export const maxDuration = 60;

/**
 * POST (multipart) — upload a dictionary/textbook for a language.
 *
 * - PDF/TXT  — stores the file, extracts text, chunks + embeds it for RAG.
 * - CSV/TSV  — additionally parsed as a structured dictionary (term,
 *              translation, definition, example) straight into
 *              dictionary_entries, so spreadsheets become words, not chunks.
 */
export async function POST(request: Request) {
  const denied = await requireModerator(request);
  if (denied) return denied;

  const form = await request.formData();
  const languageId = form.get("language_id") as string | null;
  const file = form.get("file") as File | null;

  if (!languageId || !file)
    return NextResponse.json(
      { error: "language_id and file required" },
      { status: 400 },
    );

  const supabase = getSupabaseServer();
  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  // 1. Store the original file.
  const storagePath = `${languageId}/${Date.now()}-${file.name}`;
  await supabase.storage
    .from(BUCKETS.documents)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  // 2. Record the document.
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      language_id: languageId,
      filename: file.name,
      storage_path: storagePath,
      mime: file.type || null,
      status: "processing",
    })
    .select()
    .single();
  if (docErr || !doc)
    return NextResponse.json(
      { error: docErr?.message ?? "insert failed" },
      { status: 500 },
    );

  // 3. Extract text.
  let text = "";
  try {
    if (isPdf) {
      const { text: pdfText } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      text = Array.isArray(pdfText) ? pdfText.join("\n") : pdfText;
    } else {
      text = buffer.toString("utf-8");
    }
  } catch {
    text = "";
  }

  // 3.5 Structured dictionary import for tabular files.
  let importedEntries = 0;
  if (text && isTabular(file.name, file.type || null)) {
    const parsed = parseDictionaryTable(text);
    if (parsed.length > 0) {
      const { error: impErr } = await supabase
        .from("dictionary_entries")
        .insert(
          parsed.map((e) => ({
            language_id: languageId,
            term: e.term,
            translation: e.translation,
            definition: e.definition,
            example: e.example,
            source: "import",
          })),
        );
      if (!impErr) importedEntries = parsed.length;
      else console.error("Dictionary import failed:", impErr.message);
    }
  }

  const chunks = chunkText(text);

  // 4. Embed + store chunks (requires Gemini key).
  let ingested = 0;
  let status = "ready";
  if (chunks.length === 0) {
    status = "empty";
  } else if (!geminiEnabled()) {
    status = "no_embeddings"; // text stored, embeddings pending API key
  } else {
    try {
      ingested = await ingestChunks(doc.id, languageId, chunks);
    } catch (e) {
      status = "embed_failed";
      console.error("Embedding failed:", e);
    }
  }

  await supabase.from("documents").update({ status }).eq("id", doc.id);

  return NextResponse.json({
    ok: true,
    document: { ...doc, status },
    chunks: chunks.length,
    ingested,
    importedEntries,
  });
}
