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

  // Per-language counts (dataset size + dictionary size). Head-only count
  // queries: fetching rows would silently cap at PostgREST's 1000-row limit.
  const ids = (languages ?? []).map((l) => l.id);
  const counts: Record<string, { responses: number; entries: number }> = {};

  await Promise.all(
    ids.map(async (id) => {
      const [resp, entries] = await Promise.all([
        supabase
          .from("quiz_responses")
          .select("id", { count: "exact", head: true })
          .eq("language_id", id),
        supabase
          .from("dictionary_entries")
          .select("id", { count: "exact", head: true })
          .eq("language_id", id),
      ]);
      counts[id] = {
        responses: resp.count ?? 0,
        entries: entries.count ?? 0,
      };
    }),
  );

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
