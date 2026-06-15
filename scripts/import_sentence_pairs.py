# Import full sentence pairs (3-8 target words) from a ru<->target parallel
# corpus into the `sentence_pairs` table, so the Learn lesson can offer a
# Duolingo-style "translate the sentence" exercise (tap target words in order).
#
# Single-word/short pairs already live in dictionary_entries (see
# import_corpus_pairs.py); this script is specifically about real sentences.
#
# Usage: python scripts/import_sentence_pairs.py --iso alt [--apply] [--limit 1500]
#   (dry run by default; reads keys from .env.local, corpus from %TEMP%)

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

import pyarrow.parquet as pq

# The corpus mixes Latin lookalikes into Cyrillic text.
LATIN_FIX = str.maketrans({"ö": "ӧ", "Ö": "Ӧ", "ÿ": "ӱ", "ü": "ӱ", "Ü": "Ӱ"})

# Per-language config: corpus columns, allowed alphabet, language_id.
CONFIGS = {
    "alt": {
        "language_id": "df9bbb7f-1681-42c7-b985-5facae0c307c",
        "ru_col": "Русский",
        "target_col": "Алтайский",
        "target_chars": "а-яёӧӱҥј",
    },
    "kjh": {
        "language_id": "72106c8b-af18-46e2-94ea-7b7a02c168b1",
        "ru_col": "Русский",
        "target_col": "Хакасский",
        "target_chars": "а-яёғіӧӱҥ",
    },
}

MIN_T, MAX_T = 3, 8   # target-language word count window
MIN_RU, MAX_RU = 3, 10


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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--iso", required=True, choices=sorted(CONFIGS))
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, default=1500)
    args = ap.parse_args()

    cfg = CONFIGS[args.iso]
    corpus = Path(os.environ["TEMP"]) / f"{args.iso}_corpus.parquet"
    if not corpus.exists():
        sys.exit(f"corpus not found: {corpus}")

    ru_ok = re.compile(rf"^[а-яё][а-яё ,.!?-]*[.!?]?$", re.I)
    tgt_ok = re.compile(rf"^[{cfg['target_chars']}][{cfg['target_chars']} ,.!?-]*[.!?]?$", re.I)

    rows = pq.read_table(corpus).to_pylist()
    pairs: dict[str, tuple[str, str]] = {}  # key=target.lower() -> (target, ru)
    skipped = 0
    for r in rows:
        ru = " ".join(str(r[cfg["ru_col"]]).split()).translate(LATIN_FIX)
        tgt = " ".join(str(r[cfg["target_col"]]).split()).translate(LATIN_FIX)
        if not (MIN_T <= len(tgt.split()) <= MAX_T and MIN_RU <= len(ru.split()) <= MAX_RU):
            continue
        if not (ru_ok.match(ru) and tgt_ok.match(tgt)):
            skipped += 1
            continue
        pairs.setdefault(tgt.lower(), (tgt, ru))
    print(f"corpus: {len(rows)} rows -> {len(pairs)} clean unique sentence pairs ({skipped} noisy skipped)")

    base = env("NEXT_PUBLIC_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    lang = cfg["language_id"]

    # Idempotent: skip targets already present for this language.
    existing: set[str] = set()
    offset = 0
    while True:
        page = rest(
            f"{base}/rest/v1/sentence_pairs?language_id=eq.{lang}"
            f"&select=target&offset={offset}&limit=1000",
            key,
        )
        existing |= {(e["target"] or "").lower() for e in page}
        offset += 1000
        if len(page) < 1000:
            break

    new = [(t, ru) for k, (t, ru) in pairs.items() if k not in existing]
    new = new[: args.limit]
    print(f"existing: {len(existing)}; new to insert (capped at {args.limit}): {len(new)}")

    if not args.apply:
        print("dry run — pass --apply to insert")
        return

    for i in range(0, len(new), 500):
        batch = [
            {"language_id": lang, "source": ru, "target": t}
            for t, ru in new[i : i + 500]
        ]
        rest(f"{base}/rest/v1/sentence_pairs", key, "POST", batch, {"Prefer": "return=minimal"})
        print(f"inserted {min(i + 500, len(new))}/{len(new)}")


if __name__ == "__main__":
    main()
