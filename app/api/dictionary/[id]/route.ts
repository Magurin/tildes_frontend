import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = ["term", "translation", "definition", "example"] as const;

/**
 * PATCH — curate a dictionary entry: fix the term heard in the recording,
 * add a translation / definition / example. Quiz entries start as raw
 * speaker data, so curation is how the dictionary gains quality.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/dictionary/[id]">,
) {
  const denied = await requireRole(request, "moderator");
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      if (value !== null && typeof value !== "string")
        return NextResponse.json(
          { error: `${field} must be a string or null` },
          { status: 400 },
        );
      patch[field] = typeof value === "string" ? value.trim() || null : null;
    }
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  if ("term" in patch && !patch.term)
    return NextResponse.json({ error: "term cannot be empty" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("dictionary_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json(
      { error: error?.message ?? "not found" },
      { status: 404 },
    );
  return NextResponse.json({ entry: data });
}

/** DELETE — remove a dictionary entry (e.g. a failed recording). */
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/dictionary/[id]">,
) {
  const denied = await requireRole(req, "moderator");
  if (denied) return denied;

  const { id } = await ctx.params;
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("dictionary_entries")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
