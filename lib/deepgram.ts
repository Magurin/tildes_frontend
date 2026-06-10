import { DeepgramClient } from "@deepgram/sdk";

export function deepgramEnabled() {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

type TranscriptShape = {
  results?: {
    channels?: { alternatives?: { transcript?: string }[] }[];
  };
};

/**
 * Transcribe an audio buffer via Deepgram (SDK v5). Returns the transcript
 * text, or null when Deepgram is not configured or fails. Note: most
 * endangered languages are unsupported — the raw audio is always the source
 * of truth; transcription is best-effort for contact/instruction languages.
 */
export async function transcribeAudio(
  audio: Buffer,
  _mimetype: string,
  language?: string,
): Promise<string | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return null;

  try {
    const dg = new DeepgramClient({ apiKey });
    const res = (await dg.listen.v1.media.transcribeFile(audio, {
      model: "nova-2",
      smart_format: true,
      ...(language ? { language } : { detect_language: true }),
    })) as TranscriptShape;

    return (
      res.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? null
    );
  } catch {
    return null;
  }
}
