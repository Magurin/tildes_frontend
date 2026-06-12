# Import short (1-2 word) pairs from the ru<->alt parallel corpus into
# dictionary_entries, so the hybrid translator can answer them exactly.
# The kaikki.org import carries English glosses, so Russian lookups had
# nothing to match for Altai until these pairs exist.
#
# Usage: python scripts/import_corpus_pairs.py [--apply]
#   (dry run by default; reads keys from .env.local, corpus from %TEMP%)

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

import pyarrow.parquet as pq

ALT_LANGUAGE_ID = "df9bbb7f-1681-42c7-b985-5facae0c307c"
CORPUS = Path(os.environ["TEMP"]) / "alt_corpus.parquet"
MAX_WORDS = 2

# The corpus mixes Latin lookalikes into Cyrillic text.
LATIN_FIX = str.maketrans({"ö": "ӧ", "Ö": "Ӧ", "ÿ": "ӱ", "ü": "ӱ", "Ü": "Ӱ"})
RU_OK = re.compile(r"^[а-яё][а-яё \-]*$")
ALT_OK = re.compile(r"^[а-яёӧӱҥј][а-яёӧӱҥј \-]*$")


def env(name: str) -> str:
    for line in Path(".env.local").read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit(f"{name} not found in .env.local")


def rest(url: str, key: str, method: str = "GET", body: object = None, headers: dict = None):
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


def main() -> None:
    apply = "--apply" in sys.argv[1:]
    base = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    rows = pq.read_table(CORPUS).to_pylist()
    pairs: dict[tuple[str, str], None] = {}
    skipped = 0
    for r in rows:
        ru = " ".join(str(r["Русский"]).lower().split()).translate(LATIN_FIX)
        alt = " ".join(str(r["Алтайский"]).lower().split()).translate(LATIN_FIX)
        if not (0 < len(ru.split()) <= MAX_WORDS and 0 < len(alt.split()) <= MAX_WORDS):
            continue
        if not (RU_OK.match(ru) and ALT_OK.match(alt)):
            skipped += 1
            continue
        pairs[(alt, ru)] = None
    print(f"corpus: {len(rows)} rows -> {len(pairs)} clean unique short pairs ({skipped} noisy skipped)")

    # Skip pairs already present (idempotent re-runs).
    existing: set[tuple[str, str]] = set()
    offset = 0
    while True:
        page = rest(
            f"{base}/rest/v1/dictionary_entries?language_id=eq.{ALT_LANGUAGE_ID}"
            f"&select=term,translation&offset={offset}&limit=1000",
            key,
        )
        existing |= {((e["term"] or "").lower(), (e["translation"] or "").lower()) for e in page}
        offset += 1000
        if len(page) < 1000:
            break
    new = [(t, tr) for (t, tr) in pairs if (t, tr) not in existing]
    print(f"existing entries: {len(existing)}; new to insert: {len(new)}")

    if not apply:
        print("dry run — pass --apply to insert")
        return
    for i in range(0, len(new), 500):
        batch = [
            {"language_id": ALT_LANGUAGE_ID, "term": t, "translation": tr, "source": "import"}
            for t, tr in new[i : i + 500]
        ]
        rest(f"{base}/rest/v1/dictionary_entries", key, "POST", batch, {"Prefer": "return=minimal"})
        print(f"inserted {min(i + 500, len(new))}/{len(new)}")


if __name__ == "__main__":
    main()
