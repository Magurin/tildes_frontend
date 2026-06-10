/**
 * Lightweight CSV/TSV dictionary importer (no dependencies).
 *
 * Accepts spreadsheets exported from Excel/Google Sheets or PanLex-style
 * dumps. Recognises header columns by common names (en/ru); without a
 * header the first columns are assumed to be: term, translation,
 * definition, example.
 */

export type ImportedEntry = {
  term: string;
  translation: string | null;
  definition: string | null;
  example: string | null;
};

const HEADER_ALIASES: Record<keyof ImportedEntry, string[]> = {
  term: ["term", "word", "form", "lexeme", "слово", "термин", "лексема"],
  translation: ["translation", "gloss", "meaning", "перевод", "значение"],
  definition: ["definition", "description", "определение", "описание"],
  example: ["example", "usage", "пример", "употребление"],
};

/** Parse one CSV/TSV line honouring quoted fields. */
function parseLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** True when the filename/mime looks like a delimited table. */
export function isTabular(filename: string, mime: string | null): boolean {
  const name = filename.toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    mime === "text/csv" ||
    mime === "text/tab-separated-values"
  );
}

/** Parse CSV/TSV text into dictionary entries. */
export function parseDictionaryTable(text: string): ImportedEntry[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect separator from the first line: prefer tab, then semicolon, comma.
  const first = lines[0];
  const sep =
    first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";

  const rows = lines.map((l) => parseLine(l, sep));

  // Header detection: does the first row name any known column?
  const headerRow = rows[0].map((c) => c.toLowerCase());
  const mapping: Partial<Record<keyof ImportedEntry, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as (keyof ImportedEntry)[]) {
    const idx = headerRow.findIndex((c) => HEADER_ALIASES[key].includes(c));
    if (idx !== -1) mapping[key] = idx;
  }
  const hasHeader = mapping.term !== undefined;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const col = (row: string[], key: keyof ImportedEntry, fallback: number) => {
    const idx = hasHeader ? mapping[key] : fallback;
    if (idx === undefined) return null;
    const v = row[idx]?.trim();
    return v ? v : null;
  };

  const entries: ImportedEntry[] = [];
  for (const row of dataRows) {
    const term = col(row, "term", 0);
    if (!term) continue;
    entries.push({
      term,
      translation: col(row, "translation", 1),
      definition: col(row, "definition", 2),
      example: col(row, "example", 3),
    });
  }
  return entries;
}
