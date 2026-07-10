#!/usr/bin/env python3
"""
Turns the edited festival_data_master.xlsx back into SQL for the Supabase editor.

Reads the single "Festivaler" sheet written by export_master_xlsx.py: festival
info, plus one "Dag N" column per day. Each day cell starts with the date on its
own line, then the artists, one per line:

    2026-08-06
    Saxon
    Judas Priest

If a day cell has no date line, the date falls back to "Fra dato" + (N-1) days.

Matches each festival to an existing DB festival by name (so renaming a festival
breaks the link — change details, not the name). Festivals it can't match are
listed and skipped (new festivals need map coordinates; ask Claude to add those).

Writes supabase/seed_master_update.sql
Run:  python3 scripts/import_master_xlsx.py [festival_data_master.xlsx]
"""

import sys, re, json, unicodedata, urllib.request
from datetime import date, timedelta
import openpyxl

XLSX = sys.argv[1] if len(sys.argv) > 1 else "festival_data_master.xlsx"
SB_URL = "https://espxguvjupinrxobyabz.supabase.co"
SB_KEY = "sb_publishable_2RC59nLrzNoKDVvgu_oo2g_Ut7c6V-Z"


def norm(s):
    s = (s or "").lower()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\b(festival|festivalen|fest|open air|openair)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def sql_str(v):
    if v is None:
        return "null"
    s = str(v).strip()
    return "null" if s == "" else "'" + s.replace("'", "''") + "'"


def cell(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def to_date(s):
    try:
        return date.fromisoformat(str(s)[:10])
    except (ValueError, TypeError):
        return None


print(f"Reading {XLSX}...", file=sys.stderr)
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb["Festivaler"]
rows = list(ws.iter_rows(values_only=True))
header = rows[0]
h = {name: i for i, name in enumerate(header)}
day_cols = sorted(
    ((i, int(m.group(1))) for i, name in enumerate(header)
     if name and (m := re.match(r"\s*Dag\s+(\d+)", str(name)))),
    key=lambda t: t[1],
)

fest_info = {}   # name -> details (last row wins)
editions = []    # {name, year, date_from, date_to, ticket_url, program}
warnings = []

for r in rows[1:]:
    name = cell(r[h["Festival"]])
    if not name:
        continue
    fest_info[name] = {
        "country": cell(r[h["Land"]]),
        "city": cell(r[h["By"]]),
        "venue": cell(r[h["Sted/venue"]]),
        "category": cell(r[h["Sjanger"]]),
        "website": cell(r[h["Nettside"]]),
        "image": cell(r[h["Bilde-URL"]]) if "Bilde-URL" in h else None,
    }

    year = cell(r[h["Årstall"]])
    date_from = to_date(cell(r[h["Fra dato"]]))
    date_to = to_date(cell(r[h["Til dato"]]))
    ticket = cell(r[h["Billett-URL"]])

    # Collect the day cells into program days. Each cell: optional date line
    # first, then artist names.
    program = []
    max_day_date = None
    skip_program = False
    for col_idx, day_num in day_cols:
        raw = r[col_idx] if col_idx < len(r) else None
        lines = [ln.strip() for ln in str(raw).splitlines()] if raw is not None else []
        lines = [ln for ln in lines if ln]
        if not lines:
            continue

        # First line may be the date; otherwise fall back to Fra dato + offset.
        d = to_date(lines[0])
        if d:
            artists = lines[1:]
        else:
            artists = lines
            d = date_from + timedelta(days=day_num - 1) if date_from else None
        if not artists:
            continue
        if not d:
            warnings.append(f"{name}: har artister i «Dag {day_num}» men mangler både dato i "
                            f"cellen og «Fra dato» – hoppet over programmet.")
            skip_program = True
            break
        max_day_date = d if not max_day_date else max(max_day_date, d)
        # En semikolon i en artistlinje skiller to artister – del opp.
        names = [n.strip() for a in artists for n in a.split(";")]
        names = [n for n in names if n]
        program.append({
            "date": d.isoformat(),
            "day_label": None,
            "artists": [{"name": n, "stage": None, "time": None} for n in names],
        })
    if skip_program:
        program = []

    if not year and not program:
        continue  # nothing to write for this row's edition
    if year and not date_from and not program:
        # Year is set but we have neither a real date nor a program (e.g. artists
        # were entered without any date anywhere) — writing this would upsert an
        # empty program over whatever already exists in the DB for that year.
        warnings.append(f"{name} {int(float(year))}: har årstall men verken dato eller "
                        f"program – hoppet over for å unngå å overskrive eksisterende data.")
        continue
    if year:
        year = int(float(year))
        editions.append({
            "name": name,
            "year": year,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": (date_to or max_day_date).isoformat() if (date_to or max_day_date) else None,
            "ticket_url": ticket,
            "program": sorted(program, key=lambda d: d["date"]),
        })

# --- Match names to existing DB slugs --------------------------------------
print("Fetching DB festivals for matching...", file=sys.stderr)
req = urllib.request.Request(f"{SB_URL}/rest/v1/festivals?select=name,slug&limit=5000",
                             headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"})
db = json.load(urllib.request.urlopen(req))
db_by_norm = {}
for row in db:
    db_by_norm.setdefault(norm(row["name"]), row["slug"])


def match_slug(name):
    n = norm(name)
    if not n:
        return None
    if n in db_by_norm:
        return db_by_norm[n]
    if len(n) >= 5:
        for dn, slug in db_by_norm.items():
            if len(dn) >= 5 and (n in dn or dn in n):
                return slug
    return None


name_to_slug = {}
unmatched = []
for name in fest_info:
    slug = match_slug(name)
    if slug:
        name_to_slug[name] = slug
    else:
        unmatched.append(name)

editions = [e for e in editions if e["name"] in name_to_slug]

# --- Emit SQL --------------------------------------------------------------
out = ["-- Auto-generated by scripts/import_master_xlsx.py",
       f"-- {len(name_to_slug)} festivals updated, {len(editions)} editions\n"]

# 1. Update festival-level details (matched festivals only).
out.append("update festivals fest set")
out.append("  country     = coalesce(v.country, fest.country),")
out.append("  city        = coalesce(v.city, fest.city),")
out.append("  venue_name  = coalesce(v.venue, fest.venue_name),")
out.append("  category    = coalesce(v.category, fest.category),")
out.append("  website_url = coalesce(v.website, fest.website_url),")
out.append("  image_url   = coalesce(v.image, fest.image_url)")
out.append("from (values")
det_rows = []
for name, slug in name_to_slug.items():
    d = fest_info[name]
    det_rows.append(f"  ({sql_str(slug)}, {sql_str(d['country'])}, {sql_str(d['city'])}, "
                    f"{sql_str(d['venue'])}, {sql_str(d['category'])}, {sql_str(d['website'])}, "
                    f"{sql_str(d['image'])})")
out.append(",\n".join(det_rows))
out.append(") as v(slug, country, city, venue, category, website, image)")
out.append("where fest.slug = v.slug;\n")

# 2. Upsert editions + program.
if editions:
    out.append("insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)")
    out.append("select fest.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, v.program::jsonb, 'manual'")
    out.append("from (values")
    ed_rows = []
    for e in editions:
        pj = json.dumps(e["program"], ensure_ascii=False)
        ed_rows.append(f"  ({sql_str(name_to_slug[e['name']])}, {e['year']}, {sql_str(e['date_from'])}, "
                       f"{sql_str(e['date_to'])}, {sql_str(e['ticket_url'])}, {sql_str(pj)})")
    out.append(",\n".join(ed_rows))
    out.append(") as v(slug, year, date_from, date_to, ticket_url, program)")
    out.append("join festivals fest on fest.slug = v.slug")
    out.append("""on conflict (festival_id, year) do update set
  date_from = coalesce(excluded.date_from, festival_editions.date_from),
  date_to = coalesce(excluded.date_to, festival_editions.date_to),
  ticket_url = coalesce(excluded.ticket_url, festival_editions.ticket_url),
  program = excluded.program,
  source = 'manual',
  updated_at = now();""")

with open("supabase/seed_master_update.sql", "w") as f:
    f.write("\n".join(out) + "\n")

print(f"\nMatched {len(name_to_slug)} / {len(fest_info)} festivals | {len(editions)} editions",
      file=sys.stderr)
for w in warnings:
    print(f"  ! {w}", file=sys.stderr)
if unmatched:
    print(f"\nSKIPPED {len(unmatched)} unmatched festival name(s) — new festivals need map "
          f"coordinates, so ask Claude to add them:", file=sys.stderr)
    for n in unmatched[:40]:
        print(f"  - {n}", file=sys.stderr)
    if len(unmatched) > 40:
        print(f"  ... and {len(unmatched) - 40} more", file=sys.stderr)
print("\nWrote supabase/seed_master_update.sql", file=sys.stderr)
