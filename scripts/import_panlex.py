# Phase 2 — add-only import of PanLex (CC0) translation pairs.
#
# PanLex stores rows of (txt in a langvar) -> meaning id. Two words sharing a
# `meaning` are translations. We join each target language's rows against
# Russian (rus-*) rows on `meaning` to get (term, russian) pairs.
#
# STRICT quality filter (per user choice):
#   - Russian side: Cyrillic only, 1-2 words, no junk/markup, <= 40 chars.
#   - term: valid graphics only (Latin OR Cyrillic letters + space/hyphen/
#     apostrophe), <= 3 words, <= 40 chars. Script is NOT forced to Cyrillic
#     because gag is Latin and crh can be either.
#
# Add-only: never touches existing rows; inserts only new (term, translation)
# pairs. source = "panlex".
#
# Usage: python scripts/import_panlex.py [--apply]
#   (dry run by default; parquet shards in D:/tildes/panlex/*.parquet)

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

import duckdb

PARQUET_DIR = "D:/tildes/panlex"
SOURCE = "panlex"

LANGS = {
    "alt-000": "df9bbb7f-1681-42c7-b985-5facae0c307c",
    "atv-000": "2902bad8-04cf-4243-979b-89619959fdef",
    "nog-000": "1c32a3be-3400-48e6-84d9-6a9b625f7301",
    "gag-000": "81a4c10b-c010-496d-9fb7-f92268f9f258",
    "cjs-000": "cfb67908-1931-4d26-8ff8-a5030c02c2a5",
    "tyv-000": "0a61608e-d729-40d9-b0b7-e33183709f08",
    "crh-000": "135b3d96-cc72-4775-8334-e32a61a778f0",
    "kjh-000": "72106c8b-af18-46e2-94ea-7b7a02c168b1",
}

# Letters allowed in a term: Latin (basic + Latin-1 + Extended-A/B) and
# Cyrillic (+ extended), plus space, hyphen, apostrophes.
TERM_OK = re.compile(
    r"^[A-Za-zÀ-ɏЀ-ԯ]"
    r"[A-Za-zÀ-ɏЀ-ԯ \-'ʼ’]*$"
)
WS = re.compile(r"\s+")


def env(name: str) -> str:
    for line in Path(".env.local").read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit(f"{name} not found in .env.local")


def rest(url, key, method="GET", body=None, headers=None):
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req) as r:
        text = r.read().decode()
        return json.loads(text) if text else None


def term_ok(t: str) -> bool:
    if not t or len(t) > 40:
        return False
    if len(t.split()) > 3:
        return False
    return bool(TERM_OK.match(t))


def query_pairs():
    files = sorted(Path(PARQUET_DIR).glob("*.parquet"))
    if not files:
        sys.exit(f"no parquet files in {PARQUET_DIR}")
    flist = "[" + ",".join("'" + f.as_posix() + "'" for f in files) + "]"
    luids = "(" + ",".join("'" + k + "'" for k in LANGS) + ")"
    con = duckdb.connect()
    # Russian side filtered hard in SQL to keep the join small.
    sql = f"""
    WITH tgt AS (
        SELECT meaning, langvar_uid AS luid, txt AS term
        FROM read_parquet({flist})
        WHERE langvar_uid IN {luids} AND txt IS NOT NULL
    ),
    rus AS (
        SELECT DISTINCT meaning, lower(trim(txt)) AS rus
        FROM read_parquet({flist})
        WHERE langvar_uid LIKE 'rus-%' AND txt IS NOT NULL
          AND length(trim(txt)) BETWEEN 1 AND 40
          AND regexp_full_match(lower(trim(txt)), '^[а-яё][а-яё \\-]*$')
          AND length(string_split(trim(txt), ' ')) <= 2
    )
    SELECT DISTINCT t.luid, t.term, r.rus
    FROM tgt t JOIN rus r USING (meaning)
    """
    print("running DuckDB join over", len(files), "shards ...", flush=True)
    return con.execute(sql).fetchall()


def main():
    apply = "--apply" in sys.argv[1:]
    base = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    rows = query_pairs()
    print(f"raw joined pairs: {len(rows)}")

    # Apply term filter + dedup per language.
    cand = {k: {} for k in LANGS}
    for luid, term, rus in rows:
        term = WS.sub(" ", (term or "").strip())
        if not term_ok(term):
            continue
        cand[luid].setdefault((term.lower(), rus), (term, rus))
    print("clean candidates per lang:")
    for k in LANGS:
        print(f"  {k}: {len(cand[k])}")

    grand = 0
    for luid, lid in LANGS.items():
        pairs = cand[luid]
        if not pairs:
            continue
        existing = set()
        offset = 0
        while True:
            page = rest(
                f"{base}/rest/v1/dictionary_entries?language_id=eq.{lid}"
                f"&select=term,translation&offset={offset}&limit=1000",
                key,
            )
            existing |= {
                ((e["term"] or "").lower(), (e["translation"] or "").lower())
                for e in page
            }
            offset += 1000
            if len(page) < 1000:
                break
        new = [v for k, v in pairs.items() if k not in existing]
        print(f"[{luid}] existing={len(existing)} candidates={len(pairs)} new={len(new)}")
        grand += len(new)
        if not apply or not new:
            continue
        for i in range(0, len(new), 500):
            batch = [
                {"language_id": lid, "term": t, "translation": tr, "source": SOURCE}
                for t, tr in new[i : i + 500]
            ]
            rest(
                f"{base}/rest/v1/dictionary_entries",
                key,
                "POST",
                batch,
                {"Prefer": "return=minimal"},
            )
            print(f"  [{luid}] inserted {min(i + 500, len(new))}/{len(new)}")

    print(f"\nTOTAL new to insert: {grand}")
    if not apply:
        print("dry run — pass --apply to insert")


if __name__ == "__main__":
    main()
