import { NextResponse } from "next/server";
import { transcribeAudio, deepgramEnabled } from "@/lib/deepgram";

export const dynamic = "force-dynamic";

/** POST (multipart) — best-effort transcription of an audio clip via Deepgram. */
export async function POST(request: Request) {
  if (!deepgramEnabled())
    return NextResponse.json(
      { error: "Deepgram is not configured", transcript: null },
      { status: 200 },
    );

  const form = await request.formData();
  const audio = form.get("audio") as File | null;
  const language = (form.get("language") as string | null) || undefined;
  if (!audio)
    return NextResponse.json({ error: "audio required" }, { status: 400 });

  const buffer = Buffer.from(await audio.arrayBuffer());
  const transcript = await transcribeAudio(buffer, audio.type, language);
  return NextResponse.json({ transcript });
}
