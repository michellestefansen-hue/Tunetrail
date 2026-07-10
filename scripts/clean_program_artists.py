#!/usr/bin/env python3
"""
Finds bad "artist" entries in festival_editions.program (jsonb) that leaked in
via scripts/import_master_xlsx.py from messy Excel research data:

  1. Pure numbers/years (e.g. name="1111") that ended up as their own artist line.
  2. Long semicolon-separated multi-artist strings with times/stages baked in.
  3. Schedule/comment text that isn't an artist name at all (e.g. "Kilde: ...").

Category 1 and 3 entries are dropped outright. Category 2 entries are split on
";" into separate artist entries (stripping obvious time/stage prefixes like
"20:00 " or " - Main Stage" where possible); anything that still looks messy
after splitting is kept as-is but flagged for manual review.

This script only READS from Supabase and WRITES a SQL file for manual review —
it never touches the database directly.

Run:  python3 scripts/clean_program_artists.py
Writes: supabase/seed_clean_program_artists.sql
"""

import json, re, urllib.request, urllib.parse

SB_URL = "https://espxguvjupinrxobyabz.supabase.co"
SB_KEY = "sb_publishable_2RC59nLrzNoKDVvgu_oo2g_Ut7c6V-Z"
SELECT = "id,year,program,festivals(name,slug)"

NUMBER_RE = re.compile(r"^\s*\d{3,4}\s*$")
COMMENT_MARKERS = ("kilde:", "http://", "https://", "source:")
TIME_RE = re.compile(r"\d{1,2}[:.]\d{2}")
LEADING_TIME_STAGE_RE = re.compile(
    r"^\s*(?:\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?\s*[:\-–]?\s*)"
    r"(?:\([^)]*\)\s*)?"
)
TRAILING_STAGE_RE = re.compile(
    r"\s*[-–(]\s*(?:main|second|third|club|tent|stage|scene|arena|hall)[^;]*$",
    re.IGNORECASE,
)


def is_pure_number(name):
    return bool(NUMBER_RE.match(name))


def is_comment(name):
    low = name.lower()
    return any(marker in low for marker in COMMENT_MARKERS)


def is_messy_multi(name):
    if len(name) <= 55:
        return False
    return ";" in name or bool(TIME_RE.search(name))


def clean_piece(piece):
    piece = LEADING_TIME_STAGE_RE.sub("", piece)
    piece = TRAILING_STAGE_RE.sub("", piece)
    return piece.strip(" -–:\t")


def split_messy(name):
    """Split a semicolon-separated multi-artist blob into artist names.
    Returns (pieces, still_messy) — still_messy True if the result still
    contains obvious time/stage residue and needs a human look."""
    raw_pieces = [p for p in (s.strip() for s in name.split(";")) if p]
    if len(raw_pieces) <= 1:
        return [name], True
    cleaned = [clean_piece(p) for p in raw_pieces]
    cleaned = [c for c in cleaned if c]
    still_messy = any(TIME_RE.search(c) or len(c) > 55 for c in cleaned)
    return cleaned, still_messy


def sql_str(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def fetch_editions():
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/festival_editions?select={urllib.parse.quote(SELECT, safe=',()')}&limit=5000",
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"},
    )
    return json.load(urllib.request.urlopen(req))


def main():
    print("Fetching festival_editions from Supabase...")
    editions = fetch_editions()
    print(f"  {len(editions)} editions")

    updates = []       # (edition_id, festival_name, year, new_program)
    report_lines = []
    manual_review = []

    for ed in editions:
        fest = ed.get("festivals") or {}
        fest_name = fest.get("name") or "?"
        fest_slug = fest.get("slug") or "?"
        program = ed.get("program") or []
        changed = False
        removed = []
        split_ok = []
        flagged = []
        new_program = []

        for day in program:
            artists = day.get("artists") or []
            new_artists = []
            for a in artists:
                name = (a.get("name") or "").strip()
                if not name:
                    new_artists.append(a)
                    continue

                if is_pure_number(name):
                    removed.append((day.get("date"), name, "ren tall/årstall"))
                    changed = True
                    continue

                if is_comment(name):
                    removed.append((day.get("date"), name, "kommentar/kilde-tekst"))
                    changed = True
                    continue

                if is_messy_multi(name):
                    pieces, still_messy = split_messy(name)
                    if len(pieces) > 1:
                        changed = True
                        for p in pieces:
                            new_artists.append({"name": p, "stage": a.get("stage"), "time": a.get("time")})
                        if still_messy:
                            flagged.append((day.get("date"), name, pieces))
                        else:
                            split_ok.append((day.get("date"), name, pieces))
                        continue
                    else:
                        flagged.append((day.get("date"), name, pieces))
                        new_artists.append(a)
                        continue

                new_artists.append(a)

            new_day = dict(day)
            new_day["artists"] = new_artists
            new_program.append(new_day)

        if changed:
            updates.append((ed["id"], fest_name, fest_slug, ed.get("year"), new_program))

        if removed or split_ok or flagged:
            report_lines.append(f"\n## {fest_name} ({fest_slug}) {ed.get('year')}")
            for date_, name, reason in removed:
                report_lines.append(f"  - FJERNET [{date_}] {reason}: {name!r}")
            for date_, name, pieces in split_ok:
                report_lines.append(f"  - SPLITTET [{date_}]: {name!r}")
                for p in pieces:
                    report_lines.append(f"      -> {p!r}")
            for date_, name, pieces in flagged:
                report_lines.append(f"  - MANUELL GJENNOMGANG [{date_}]: {name!r}")
                if len(pieces) > 1:
                    for p in pieces:
                        report_lines.append(f"      -> {p!r} (fortsatt rotete)")
                manual_review.append((fest_name, ed.get("year"), date_, name))

    # --- Write report -------------------------------------------------
    print("\n".join(report_lines) if report_lines else "Ingen problemer funnet.")
    print(f"\n{len(updates)} editions vil bli endret, {len(manual_review)} oppføringer trenger manuell sjekk.")

    # --- Write SQL ------------------------------------------------------
    out = ["-- Auto-generated by scripts/clean_program_artists.py",
           "-- GJENNOMGÅ FØR KJØRING i Supabase SQL Editor.",
           f"-- {len(updates)} festival_editions oppdatert.",
           "-- Oppføringer merket MANUELL GJENNOMGANG i konsoll-rapporten er IKKE automatisk fikset,",
           "-- de er kun splittet på semikolon best-effort og bør sjekkes manuelt før/etter kjøring.\n"]

    for edition_id, fest_name, fest_slug, year, new_program in updates:
        pj = json.dumps(new_program, ensure_ascii=False)
        out.append(f"-- {fest_name} ({fest_slug}) {year}")
        out.append("update festival_editions set")
        out.append(f"  program = {sql_str(pj)}::jsonb,")
        out.append("  updated_at = now()")
        out.append(f"where id = {sql_str(edition_id)};\n")

    with open("supabase/seed_clean_program_artists.sql", "w") as f:
        f.write("\n".join(out) + "\n")

    print("\nWrote supabase/seed_clean_program_artists.sql")


if __name__ == "__main__":
    main()
