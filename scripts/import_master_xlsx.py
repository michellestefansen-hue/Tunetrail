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

Rows are matched on the "Slug" column only — never on the name. Name matching
used to guess by substring, which meant that editing a name (exactly what a
clean-up pass involves) could silently write the row's edits onto a different
festival: shortening "Jazz à Vienne" landed on "Jazz à Liège" in Belgium, and
"Rock im Park" on "Rock Imperium" in Spain. With the slug as the key, the name
is just another editable field, so fixing a spelling renames the festival.

Rows whose slug is blank or unknown are listed and skipped — a new festival
needs map coordinates, so ask Claude to add those.

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

if "Slug" not in h:
    sys.exit("This sheet has no 'Slug' column — re-export it with "
             "scripts/export_master_xlsx.py before importing.")


def num(v):
    try:
        return float(str(v).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None


fest_info = {}   # slug -> details (last row wins)
editions = []    # {slug, year, date_from, date_to, ticket_url, program}
warnings = []
no_slug = []

for r in rows[1:]:
    slug = cell(r[h["Slug"]])
    name = cell(r[h["Festival"]])
    if not slug:
        if name:
            no_slug.append(name)
        continue
    fest_info[slug] = {
        "name": name,
        "country": cell(r[h["Land"]]),
        "city": cell(r[h["By"]]),
        "region": cell(r[h["Region"]]) if "Region" in h else None,
        "venue": cell(r[h["Sted/venue"]]),
        "category": cell(r[h["Sjanger"]]),
        "website": cell(r[h["Nettside"]]),
        "image": cell(r[h["Bilde-URL"]]) if "Bilde-URL" in h else None,
        "lat": num(r[h["Breddegrad"]]) if "Breddegrad" in h else None,
        "lon": num(r[h["Lengdegrad"]]) if "Lengdegrad" in h else None,
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
            "slug": slug,
            "year": year,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": (date_to or max_day_date).isoformat() if (date_to or max_day_date) else None,
            "ticket_url": ticket,
            "program": sorted(program, key=lambda d: d["date"]),
        })

# --- Check the slugs against the database ----------------------------------
# An exact lookup, deliberately: guessing which festival a row meant is what
# used to send edits to the wrong country.
print("Checking slugs against the database...", file=sys.stderr)
req = urllib.request.Request(f"{SB_URL}/rest/v1/festivals?select=slug&limit=5000",
                             headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"})
known = {row["slug"] for row in json.load(urllib.request.urlopen(req))}

unknown = sorted(s for s in fest_info if s not in known)
for s in unknown:
    fest_info.pop(s)
editions = [e for e in editions if e["slug"] in fest_info]

# --- Emit SQL ---------------------------------------------------------------
# Split into several files: the Supabase SQL Editor rejects one big query, and
# a handful of programs (300+ artists) make a single statement huge on their
# own. Chunks are sized by character budget, not row count, so one festival
# with a massive line-up doesn't blow past the limit on its own.
MAX_CHUNK_CHARS = 150_000


def chunk_by_size(rows, max_chars):
    chunk, size = [], 0
    for row in rows:
        if chunk and size + len(row) > max_chars:
            yield chunk
            chunk, size = [], 0
        chunk.append(row)
        size += len(row)
    if chunk:
        yield chunk


det_rows = []
for slug, d in fest_info.items():
    lat = "null::double precision" if d["lat"] is None else str(d["lat"])
    lon = "null::double precision" if d["lon"] is None else str(d["lon"])
    det_rows.append(f"  ({sql_str(slug)}, {sql_str(d['name'])}, {sql_str(d['country'])}, "
                    f"{sql_str(d['city'])}, {sql_str(d['region'])}, {sql_str(d['venue'])}, "
                    f"{sql_str(d['category'])}, {sql_str(d['website'])}, {sql_str(d['image'])}, "
                    f"{lat}, {lon})")

ed_rows = []
for e in editions:
    pj = json.dumps(e["program"], ensure_ascii=False)
    ed_rows.append(f"  ({sql_str(e['slug'])}, {e['year']}, {sql_str(e['date_from'])}, "
                   f"{sql_str(e['date_to'])}, {sql_str(e['ticket_url'])}, {sql_str(pj)})")

files = []


def write_chunked(rows, header_lines, footer, file_prefix):
    chunks = list(chunk_by_size(rows, MAX_CHUNK_CHARS))
    for i, chunk in enumerate(chunks, start=1):
        out = list(header_lines)
        out.append(",\n".join(chunk))
        out.append(footer)
        name = f"supabase/{file_prefix}.sql" if len(chunks) == 1 else f"supabase/{file_prefix}_{i}_av_{len(chunks)}.sql"
        with open(name, "w") as f:
            f.write("\n".join(out) + "\n")
        files.append((name, len(chunk)))


# The name is included, so correcting a spelling in the sheet renames the
# festival instead of orphaning the row.
if det_rows:
    write_chunked(
        det_rows,
        [
            "-- Auto-generated by scripts/import_master_xlsx.py",
            "update festivals fest set",
            "  name        = coalesce(v.name, fest.name),",
            "  country     = coalesce(v.country, fest.country),",
            "  city        = coalesce(v.city, fest.city),",
            "  region      = coalesce(v.region, fest.region),",
            "  venue_name  = coalesce(v.venue, fest.venue_name),",
            "  category    = coalesce(v.category, fest.category),",
            "  website_url = coalesce(v.website, fest.website_url),",
            "  image_url   = coalesce(v.image, fest.image_url),",
            "  latitude    = coalesce(v.lat, fest.latitude),",
            "  longitude   = coalesce(v.lon, fest.longitude)",
            "from (values",
        ],
        ") as v(slug, name, country, city, region, venue, category, website, image, lat, lon)\n"
        "where fest.slug = v.slug;",
        "seed_master_update_festivals",
    )

if ed_rows:
    write_chunked(
        ed_rows,
        [
            "-- Auto-generated by scripts/import_master_xlsx.py",
            "insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)",
            "select fest.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, v.program::jsonb, 'manual'",
            "from (values",
        ],
        ") as v(slug, year, date_from, date_to, ticket_url, program)\n"
        "join festivals fest on fest.slug = v.slug\n"
        "on conflict (festival_id, year) do update set\n"
        "  date_from = coalesce(excluded.date_from, festival_editions.date_from),\n"
        "  date_to = coalesce(excluded.date_to, festival_editions.date_to),\n"
        "  ticket_url = coalesce(excluded.ticket_url, festival_editions.ticket_url),\n"
        "  program = excluded.program,\n"
        "  source = 'manual',\n"
        "  updated_at = now();",
        "seed_master_update_editions",
    )

print(f"\n{len(fest_info)} festivals | {len(editions)} editions", file=sys.stderr)
for w in warnings:
    print(f"  ! {w}", file=sys.stderr)
if no_slug:
    print(f"\nSKIPPED {len(no_slug)} row(s) with an empty Slug — a new festival needs map "
          f"coordinates, so ask Claude to add these:", file=sys.stderr)
    for n in no_slug[:40]:
        print(f"  - {n}", file=sys.stderr)
    if len(no_slug) > 40:
        print(f"  ... and {len(no_slug) - 40} more", file=sys.stderr)
if unknown:
    print(f"\nSKIPPED {len(unknown)} row(s) whose Slug is not in the database. The slug is the "
          f"key — if it was edited, restore it by re-exporting:", file=sys.stderr)
    for s in unknown[:40]:
        print(f"  - {s}", file=sys.stderr)
    if len(unknown) > 40:
        print(f"  ... and {len(unknown) - 40} more", file=sys.stderr)
print(f"\nWrote {len(files)} file(s) — run them in order, each is a complete statement:",
      file=sys.stderr)
for name, n_rows in files:
    print(f"  {name}  ({n_rows} rows)", file=sys.stderr)
