/**
 * App-wide constants for Tildes AI.
 */

/**
 * How many quiz responses a language needs before the "Бот" section
 * switches from picture-quiz mode into free chat mode.
 */
export const DATASET_THRESHOLD = 10;

/** RAG chunking parameters (characters). */
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 150;

/** Dimensionality of Gemini `text-embedding-004` vectors. */
export const EMBEDDING_DIM = 768;

/** Number of RAG chunks pulled into the chat prompt. */
export const RAG_MATCH_COUNT = 6;

/** Storage bucket names. */
export const BUCKETS = {
  quizImages: "quiz-images",
  audio: "audio",
  documents: "documents",
} as const;

/** Models, overridable via env. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
export const GEMINI_EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
