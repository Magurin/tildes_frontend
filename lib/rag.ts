import { CHUNK_SIZE, CHUNK_OVERLAP, RAG_MATCH_COUNT } from "./config";
import { embedTexts, embedText } from "./gemini";
import { getSupabaseServer } from "./supabase/server";

/** Split text into overlapping chunks for embedding. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/** Embed and store document chunks for RAG. */
export async function ingestChunks(
  documentId: string,
  languageId: string,
  chunks: string[],
): Promise<number> {
  if (chunks.length === 0) return 0;
  const supabase = getSupabaseServer();
  const vectors = await embedTexts(chunks);

  const rows = chunks.map((content, i) => ({
    document_id: documentId,
    language_id: languageId,
    content,
    embedding: vectors[i] ?? null,
  }));

  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Retrieve the most relevant chunks for a query within one language. */
export async function retrieveContext(
  languageId: string,
  query: string,
): Promise<string[]> {
  // RAG is best-effort: if embeddings or the RPC fail, the chat continues
  // without document context rather than erroring out.
  try {
    const supabase = getSupabaseServer();
    const queryEmbedding = await embedText(query);
    if (queryEmbedding.length === 0) return [];

    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_language: languageId,
      match_count: RAG_MATCH_COUNT,
    });
    if (error || !data) return [];
    return (data as { content: string }[]).map((r) => r.content);
  } catch {
    return [];
  }
}
