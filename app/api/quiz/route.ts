import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/deepgram";
import { BUCKETS } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * GET ?language_id — return the next quiz image the speaker has not yet
 * answered for this language (falls back to any image once all answered).
 */
export async function GET(request: Request) {
  const languageId = new URL(request.url).searchParams.get("language_id");
  if (!languageId)
    return NextResponse.json({ error: "language_id required" }, { status: 400 });

  const supabase = getSupabaseServer();

  const [{ data: images }, { data: answered }] = await Promise.all([
    supabase.from("quiz_images").select("*").order("sort_order"),
    supabase
      .from("quiz_responses")
      .select("quiz_image_id")
      .eq("language_id", languageId),
  ]);

  const answeredIds = new Set((answered ?? []).map((r) => r.quiz_image_id));
  const all = images ?? [];
  const next = all.find((img) => !answeredIds.has(img.id)) ?? null;

  return NextResponse.json({
    image: next,
    answeredCount: answeredIds.size,
    totalCount: all.length,
    done: !next,
  });
}

/**
 * POST (multipart) — record a contribution: an in-app drawing + a voice
 * recording (no text). Uploads both, best-effort transcribes the audio, and
 * stores the response plus a dictionary entry whose visual meaning is the
 * drawing.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const languageId = form.get("language_id") as string | null;
  const quizImageId = (form.get("quiz_image_id") as string | null) || null;
  const audio = form.get("audio") as File | null;
  const drawing = form.get("drawing") as File | null;

  if (!languageId)
    return NextResponse.json(
      { error: "language_id required" },
      { status: 400 },
    );
  if (!audio)
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  if (!drawing)
    return NextResponse.json({ error: "drawing required" }, { status: 400 });

  const supabase = getSupabaseServer();
  const stamp = Date.now();

  // 1. Upload the voice recording.
  let audioUrl: string | null = null;
  const audioBuf = Buffer.from(await audio.arrayBuffer());
  const audioPath = `${languageId}/${stamp}.webm`;
  const { error: aErr } = await supabase.storage
    .from(BUCKETS.audio)
    .upload(audioPath, audioBuf, { contentType: audio.type, upsert: true });
  if (!aErr)
    audioUrl = supabase.storage.from(BUCKETS.audio).getPublicUrl(audioPath)
      .data.publicUrl;

  // 2. Upload the in-app drawing (stored under contributions/ in quiz-images).
  let drawingUrl: string | null = null;
  const drawBuf = Buffer.from(await drawing.arrayBuffer());
  const drawPath = `contributions/${languageId}/${stamp}.png`;
  const { error: dErr } = await supabase.storage
    .from(BUCKETS.quizImages)
    .upload(drawPath, drawBuf, { contentType: "image/png", upsert: true });
  if (!dErr)
    drawingUrl = supabase.storage
      .from(BUCKETS.quizImages)
      .getPublicUrl(drawPath).data.publicUrl;

  // 3. Best-effort transcription (most endangered languages are unsupported).
  const transcript = await transcribeAudio(audioBuf, audio.type);

  // 4. Store the response.
  const { error: respErr } = await supabase.from("quiz_responses").insert({
    language_id: languageId,
    quiz_image_id: quizImageId,
    answer_text: null,
    audio_url: audioUrl,
    drawing_url: drawingUrl,
    transcript,
  });
  if (respErr)
    return NextResponse.json({ error: respErr.message }, { status: 500 });

  // 5. Seed a dictionary entry: drawing = meaning, audio = pronunciation.
  await supabase.from("dictionary_entries").insert({
    language_id: languageId,
    term: transcript || "— (запись носителя)",
    source: "quiz",
    audio_url: audioUrl,
    image_url: drawingUrl,
  });

  return NextResponse.json({ ok: true, audioUrl, drawingUrl, transcript });
}
