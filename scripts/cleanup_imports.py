# One-off cleanup of the 16.06 dictionary import:
#   1. Delete affix/morpheme articles from ru.wiktionary (term starts/ends "-").
#   2. Delete Cyrillic Gagauz entries (gag is Latin-script; Latin is the
#      majority 1654 vs 922 — keep Latin, drop Cyrillic) across ALL sources.
#   3. Strip dictionary markup from ru.wiktionary translations:
#      sense refs [1]/[I] and leading domain labels (ботан./зоол./...).
#
# Usage: python scripts/cleanup_imports.py [--apply]

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)

GAG = "81a4c10b-c010-496d-9fb7-f92268f9f258"
CYR = re.compile(r"[Ѐ-ԯ]")
LAT = re.compile(r"[A-Za-zÀ-ɏ]")
REF = re.compile(r"\s*\[[0-9IVXLCMivxlcm]+\]")
LABELS = {
    "ботан", "зоол", "анат", "разг", "перен", "устар", "хим", "биол", "мат",
    "физ", "грам", "грамм", "лингв", "геогр", "мед", "техн", "муз", "рел",
    "книжн", "прост", "спорт", "воен", "юр", "экон", "астр", "геол", "бот",
    "собир", "поэт", "ирон", "груб", "ласк", "уменьш", "шутл", "диал", "фольк",
    "миф", "церк", "полит", "фин", "фарм", "мор", "авиа", "архит", "кулин",
    "с-х", "этногр", "филос", "психол", "юридич",
}
LABEL_RE = re.compile(r"^([а-яё\-]{2,7})\.\s+")


def env(n):
    for l in Path(".env.local").read_text(encoding="utf-8").splitlines():
        if l.startswith(n + "="):
            return l.split("=", 1)[1].strip().strip('"')


BASE = env("NEXT_PUBLIC_SUPABASE_URL")
KEY = env("SUPABASE_SERVICE_ROLE_KEY")


def rest(url, method="GET", body=None, headers=None):
    req = urllib.request.Request(
        BASE + url, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req) as r:
        t = r.read().decode()
        return json.loads(t) if t else None


def fetch_all(q):
    rows, off = [], 0
    while True:
        page = rest(q + "&offset=%d&limit=1000" % off)
        rows += page
        off += 1000
        if len(page) < 1000:
            break
    return rows


def script(s):
    c, l = len(CYR.findall(s or "")), len(LAT.findall(s or ""))
    if c and not l: return "cyr"
    if l and not c: return "lat"
    if c and l: return "mix"
    return "none"


def is_affix(t):
    t = (t or "").strip()
    return t.startswith("-") or t.endswith("-") or t.startswith("=")


def clean_tr(tr):
    s = REF.sub("", tr or "")
    while True:
        m = LABEL_RE.match(s)
        if m and m.group(1) in LABELS:
            s = s[m.end():]
        else:
            break
    s = re.sub(r"\s+", " ", s).strip(" ,;—-")
    return s


def main():
    apply = "--apply" in sys.argv[1:]

    # Gather delete set.
    ruw = fetch_all("/rest/v1/dictionary_entries?source=eq.ruwiktionary&select=id,term,translation")
    gag = fetch_all("/rest/v1/dictionary_entries?language_id=eq.%s&select=id,term" % GAG)
    affix_ids = {r["id"] for r in ruw if is_affix(r["term"])}
    gagcyr_ids = {r["id"] for r in gag if script(r["term"]) == "cyr"}
    delete_ids = affix_ids | gagcyr_ids
    print(f"affix to delete: {len(affix_ids)}")
    print(f"gag cyrillic to delete: {len(gagcyr_ids)}")
    print(f"union delete: {len(delete_ids)}")

    # Markup cleanup on remaining ruwiktionary rows.
    updates = []
    for r in ruw:
        if r["id"] in delete_ids:
            continue
        new = clean_tr(r["translation"])
        if new and new != (r["translation"] or "").strip():
            updates.append((r["id"], r["translation"], new))
    print(f"translations to clean: {len(updates)}")
    for _id, old, new in updates[:12]:
        print(f"   {old!r} -> {new!r}")

    if not apply:
        print("\ndry run — pass --apply")
        return

    ids = list(delete_ids)
    for i in range(0, len(ids), 80):
        chunk = ids[i:i + 80]
        inlist = "(" + ",".join('"%s"' % x for x in chunk) + ")"
        rest("/rest/v1/dictionary_entries?id=in." + inlist, "DELETE",
             headers={"Prefer": "return=minimal"})
        print(f"deleted {min(i + 80, len(ids))}/{len(ids)}")

    for n, (_id, old, new) in enumerate(updates, 1):
        rest("/rest/v1/dictionary_entries?id=eq." + _id, "PATCH",
             {"translation": new}, {"Prefer": "return=minimal"})
        if n % 100 == 0 or n == len(updates):
            print(f"patched {n}/{len(updates)}")


if __name__ == "__main__":
    main()
