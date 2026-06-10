import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET — list all languages with dataset/dictionary counts. */
export async function GET() {
  const supabase = getSupabaseServer();

  const { data: languages, error } = await supabase
    .from("languages")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Per-language counts (dataset size + dictionary size).
  const ids = (languages ?? []).map((l) => l.id);
  const counts: Record<string, { responses: number; entries: number }> = {};
  for (const id of ids) counts[id] = { responses: 0, entries: 0 };

  if (ids.length) {
    const [resp, entries] = await Promise.all([
      supabase.from("quiz_responses").select("language_id"),
      supabase.from("dictionary_entries").select("language_id"),
    ]);
    for (const r of resp.data ?? [])
      if (counts[r.language_id]) counts[r.language_id].responses++;
    for (const e of entries.data ?? [])
      if (counts[e.language_id]) counts[e.language_id].entries++;
  }

  const result = (languages ?? []).map((l) => ({
    ...l,
    response_count: counts[l.id]?.responses ?? 0,
    entry_count: counts[l.id]?.entries ?? 0,
  }));

  return NextResponse.json({ languages: result });
}

/** POST — create a new language. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("languages")
    .insert({
      name: body.name,
      native_name: body.native_name ?? null,
      iso_code: body.iso_code ?? null,
      status: body.status ?? "endangered",
      description: body.description ?? null,
      speaker_count: body.speaker_count ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ language: data }, { status: 201 });
}
