import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_EMBED_MODEL, EMBEDDING_DIM } from "./config";

let client: GoogleGenAI | null = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client = new GoogleGenAI({ apiKey });
  return client;
}

/** Whether Gemini is configured (used to gracefully degrade in the UI). */
export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Generate a chat completion from a system instruction + message history. */
export async function generateChat(
  system: string,
  history: { role: "user" | "model"; text: string }[],
): Promise<string> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    config: { systemInstruction: system },
    contents: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });
  return res.text ?? "";
}

/** Embed a batch of texts. Returns one vector per input. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getClient();
  // The embed API accepts at most 100 contents per request.
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await ai.models.embedContent({
      model: GEMINI_EMBED_MODEL,
      contents: texts.slice(i, i + 100),
      config: { outputDimensionality: EMBEDDING_DIM },
    });
    out.push(...(res.embeddings ?? []).map((e) => e.values ?? []));
  }
  return out;
}

/** Embed a single text, returning its vector. */
export async function embedText(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v ?? [];
}
