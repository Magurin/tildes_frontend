import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { DictionaryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function csvEscape(value: string | null): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "dictionary"
  );
}

/**
 * GET ?format=csv|cldf — export a language's dictionary.
 *
 * - csv  — UTF-8 (with BOM) spreadsheet-friendly table.
 * - cldf — JSON in the shape of a CLDF Wordlist FormTable
 *          (https://cldf.clld.org), the standard for cross-linguistic
 *          lexical data, so dictionaries can flow into Dictionaria/Zenodo.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/languages/[id]/export">,
) {
  const { id } = await ctx.params;
  const format =
    new URL(request.url).searchParams.get("format")?.toLowerCase() ?? "csv";

  const supabase = getSupabaseServer();
  const [{ data: language }, { data: entries }] = await Promise.all([
    supabase.from("languages").select("*").eq("id", id).single(),
    supabase
      .from("dictionary_entries")
      .select("*")
      .eq("language_id", id)
      .order("term"),
  ]);

  if (!language)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const rows = (entries ?? []) as DictionaryEntry[];
  const base = slug(language.name);

  if (format === "cldf") {
    const doc = {
      "dc:conformsTo": "http://cldf.clld.org/v1.0/terms.rdf#Wordlist",
      "dc:title": `${language.name} dictionary — Tildes AI`,
      "dc:created": new Date().toISOString(),
      language: {
        ID: language.iso_code ?? language.id,
        Name: language.name,
        Native_Name: language.native_name,
        Status: language.status,
        Speaker_Count: language.speaker_count,
      },
      forms: rows.map((e, i) => ({
        ID: e.id ?? String(i + 1),
        Language_ID: language.iso_code ?? language.id,
        Form: e.term,
        Parameter: e.translation ?? null,
        Description: e.definition ?? null,
        Example: e.example ?? null,
        Media_URL: e.audio_url ?? null,
        Image_URL: e.image_url ?? null,
        Source: e.source,
        Created: e.created_at,
      })),
    };
    return new NextResponse(JSON.stringify(doc, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}-cldf.json"`,
      },
    });
  }

  // Default: CSV with BOM so Excel opens Cyrillic/diacritics correctly.
  const header = [
    "term",
    "translation",
    "definition",
    "example",
    "source",
    "audio_url",
    "image_url",
    "created_at",
  ];
  const lines = [
    header.join(","),
    ...rows.map((e) =>
      [
        csvEscape(e.term),
        csvEscape(e.translation),
        csvEscape(e.definition),
        csvEscape(e.example),
        csvEscape(e.source),
        csvEscape(e.audio_url),
        csvEscape(e.image_url),
        csvEscape(e.created_at),
      ].join(","),
    ),
  ];
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}-dictionary.csv"`,
    },
  });
}
