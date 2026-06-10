import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { DATASET_THRESHOLD } from "@/lib/config";

export const dynamic = "force-dynamic";

/** GET — language details: dictionary, documents, dataset progress. */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/languages/[id]">,
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseServer();

  const { data: language, error } = await supabase
    .from("languages")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !language)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const [entries, documents, responses] = await Promise.all([
    supabase
      .from("dictionary_entries")
      .select("*")
      .eq("language_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("language_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_responses")
      .select("id")
      .eq("language_id", id),
  ]);

  const responseCount = responses.data?.length ?? 0;

  return NextResponse.json({
    language,
    entries: entries.data ?? [],
    documents: documents.data ?? [],
    responseCount,
    threshold: DATASET_THRESHOLD,
    chatReady: responseCount >= DATASET_THRESHOLD,
  });
}
