# Phase 1 — add-only import of Russian glosses from the kaikki.org
# ru.wiktionary dump into dictionary_entries.
#
# The original kaikki import for alt/crh/gag/atv carried ENGLISH glosses
# (from en.wiktionary). The Russian Wiktionary dump gives native Russian
# definitions, which is our pivot language. This script is ADD-ONLY:
# existing rows (incl. English ones) are never touched; we only insert
# (term, translation) pairs that don't already exist for the language.
#
# Usage: python scripts/import_kaikki_ru.py [--apply]
#   (dry run by default; reads keys from .env.local,
#    dump from %TEMP%/ru_wiktextract.jsonl.gz)

import gzip
import json
import re
import sys
import urllib.request
from pathlib import Path

DUMP = Path(__file__).resolve().parent.parent  # placeholder, set below

# iso_code -> language_id (from Supabase `languages`)
LANGS = {
    "alt": "df9bbb7f-1681-42c7-b985-5facae0c307c",
    "atv": "2902bad8-04cf-4243-979b-89619959fdef",
    "nog": "1c32a3be-3400-48e6-84d9-6a9b625f7301",
    "gag": "81a4c10b-c010-496d-9fb7-f92268f9f258",
    "cjs": "cfb67908-1931-4d26-8ff8-a5030c02c2a5",
    "tyv": "0a61608e-d729-40d9-b0b7-e33183709f08",
    "crh": "135b3d96-cc72-4775-8334-e32a61a778f0",
    "kjh": "72106c8b-af18-46e2-94ea-7b7a02c168b1",
}
SOURCE = "ruwiktionary"

# Glosses that are placeholders / non-translations.
BAD_GLOSS = re.compile(r"^[?\s]*$|^\.+$|^—+$")
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


def clean(s: str) -> str:
    return WS.sub(" ", (s or "").strip())


def parse_dump(dump_path: Path):
    """Yield (lang_code, term, translation, pos) tuples from the dump."""
    with gzip.open(dump_path, "rt", encoding="utf-8") as f:
        for line in f:
            try:
                o = json.loads(line)
            except Exception:
                continue
            lc = o.get("lang_code")
            if lc not in LANGS:
                continue
            term = clean(o.get("word", ""))
            if not term or len(term) > 120:
                continue
            pos = o.get("pos") or None
            seen_g = set()
            for sense in o.get("senses", []):
                for g in sense.get("glosses", []):
                    tr = clean(g)
                    if not tr or BAD_GLOSS.match(tr) or len(tr) > 300:
                        continue
                    key = tr.lower()
                    if key in seen_g:
                        continue
                    seen_g.add(key)
                    yield lc, term, tr, pos


def main():
    apply = "--apply" in sys.argv[1:]
    import os
    dump_path = Path(os.environ["TEMP"]) / "ru_wiktextract.jsonl.gz"
    base = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    # Collect candidate pairs per language (dedup within dump).
    cand = {lc: {} for lc in LANGS}  # lc -> {(term_l, tr_l): (term, tr, pos)}
    rows_seen = 0
    for lc, term, tr, pos in parse_dump(dump_path):
        rows_seen += 1
        cand[lc].setdefault((term.lower(), tr.lower()), (term, tr, pos))
    print(f"dump: {rows_seen} gloss rows -> candidates per lang:")
    for lc in LANGS:
        print(f"  {lc}: {len(cand[lc])}")

    grand_new = 0
    for lc, lid in LANGS.items():
        pairs = cand[lc]
        if not pairs:
            continue
        # Existing (term, translation) for idempotency.
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
        print(f"[{lc}] existing={len(existing)} candidates={len(pairs)} new={len(new)}")
        grand_new += len(new)

        if not apply or not new:
            continue
        for i in range(0, len(new), 500):
            batch = [
                {
                    "language_id": lid,
                    "term": term,
                    "translation": tr,
                    "definition": pos,
                    "source": SOURCE,
                }
                for term, tr, pos in new[i : i + 500]
            ]
            rest(
                f"{base}/rest/v1/dictionary_entries",
                key,
                "POST",
                batch,
                {"Prefer": "return=minimal"},
            )
            print(f"  [{lc}] inserted {min(i + 500, len(new))}/{len(new)}")

    print(f"\nTOTAL new to insert: {grand_new}")
    if not apply:
        print("dry run — pass --apply to insert")


if __name__ == "__main__":
    main()
