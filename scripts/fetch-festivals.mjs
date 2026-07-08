#!/usr/bin/env node
/**
 * Fetches real European music festivals from the Ticketmaster Discovery API
 * and writes a Supabase seed file (supabase/seed_europe.sql).
 *
 * Usage:
 *   TM_API_KEY=your_key node scripts/fetch-festivals.mjs
 *
 * Get a free key at https://developer.ticketmaster.com (Discovery API).
 *
 * The script pulls up to ~500 distinct festivals across Europe, grouping
 * multi-day/day-events into one festival with per-day lineups (from the
 * event attractions), maps Ticketmaster genres onto our category taxonomy,
 * and emits INSERT statements you paste into the Supabase SQL editor.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API_KEY = process.env.TM_API_KEY;
if (!API_KEY) {
  console.error("Missing TM_API_KEY. Get a free key at https://developer.ticketmaster.com");
  process.exit(1);
}

const MAX_FESTIVALS = 500;
const PAGES_PER_COUNTRY = 3; // 200 events/page
const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

// Country code -> Norwegian country name for the `country` column.
const COUNTRIES = {
  NO: "Norge", SE: "Sverige", DK: "Danmark", FI: "Finland", IS: "Island",
  GB: "Storbritannia", IE: "Irland", NL: "Nederland", BE: "Belgia",
  DE: "Tyskland", FR: "Frankrike", ES: "Spania", PT: "Portugal",
  IT: "Italia", CH: "Sveits", AT: "Østerrike", PL: "Polen", CZ: "Tsjekkia",
  HU: "Ungarn", HR: "Kroatia", RO: "Romania", GR: "Hellas",
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " og ")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const TICKET_NOISE =
  /\b(pass(\s+vip)?|vip|forfait|billet(s|terie)?|ticket(s)?|navette|shuttle|camping|glamping|parking|entr[ée]e|de\s*luxe|deluxe|jour\s*\d+|\d+\s*jours?|day\s*\d+|dag\s*\d+|weekend|1\s*jour|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/gi;

function titleCaseIfShouting(s) {
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

// Normalise names so day-events / ticket tiers collapse into one festival.
function cleanName(name) {
  const parts = name
    .split(/\s*[-–—|:]\s*/)
    .map((p) =>
      p
        .replace(/\b20\d{2}\b/g, " ")
        .replace(TICKET_NOISE, " ")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter((p) => p && !/^[\d&+,.\s]*$/.test(p) && !/^\(.*\)$/.test(p));

  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  return titleCaseIfShouting(
    unique.join(" - ").replace(/\s{2,}/g, " ").replace(/\s*[-–—|:]\s*$/, "").trim(),
  );
}

function mapCategory(genre, subGenre) {
  const g = (genre || "").toLowerCase();
  const sg = (subGenre || "").toLowerCase();
  if (/techno|house|trance|hard dance|drum\s*&?\s*bass|dubstep/.test(sg)) return "Techno & House";
  if (/metal/.test(g)) return "Metal";
  if (/punk|hardcore/.test(g) || /punk|hardcore/.test(sg)) return "Punk & Hardcore";
  if (/hard rock/.test(g)) return "Rock & Alternativ";
  if (/alternative|indie/.test(g)) return "Indie";
  if (/rock/.test(g)) return "Rock & Alternativ";
  if (/pop/.test(g)) return "Pop & Mainstream";
  if (/hip-?hop|rap/.test(g)) return "Hip-Hop & R&B";
  if (/r&b/.test(g)) return "Hip-Hop & R&B";
  if (/dance|electronic/.test(g)) return "Elektronisk & Dans";
  if (/jazz|blues|soul/.test(g)) return "Jazz & Soul";
  if (/classical/.test(g)) return "Klassisk";
  if (/country|folk/.test(g)) return "Folk & Americana";
  if (/reggae|world|latin/.test(g)) return "Reggae & World";
  return "Blandet/Flersjanger";
}

async function fetchPage(countryCode, page) {
  const url =
    `${BASE}?apikey=${API_KEY}&classificationName=music&keyword=festival` +
    `&countryCode=${countryCode}&size=200&page=${page}&locale=*`;
  const res = await fetch(url);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    return fetchPage(countryCode, page);
  }
  if (!res.ok) {
    console.warn(`  ${countryCode} page ${page}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data?._embedded?.events ?? [];
}

/** groupKey -> festival aggregate */
const festivals = new Map();

for (const [code, countryName] of Object.entries(COUNTRIES)) {
  process.stderr.write(`Fetching ${code} (${countryName})…\n`);
  for (let page = 0; page < PAGES_PER_COUNTRY; page++) {
    let events = [];
    try {
      events = await fetchPage(code, page);
    } catch (err) {
      console.warn(`  ${code} page ${page} failed: ${err.message}`);
      break;
    }
    if (events.length === 0) break;

    for (const ev of events) {
      const rawName = ev.name || "";
      if (!/fest/i.test(rawName)) continue; // keep festival-like events only
      const name = cleanName(rawName);
      if (!name) continue;

      const venue = ev._embedded?.venues?.[0];
      if (!venue?.location?.latitude || !venue?.location?.longitude) continue;
      if (venue.country?.countryCode !== code) continue;

      const key = `${slugify(name)}::${code}`;
      const cls = ev.classifications?.[0];
      const category = mapCategory(cls?.genre?.name, cls?.subGenre?.name);
      const date = ev.dates?.start?.localDate ?? null;
      const image = (ev.images || [])
        .filter((i) => i.width >= 640)
        .sort((a, b) => b.width - a.width)[0]?.url ?? ev.images?.[0]?.url ?? null;
      const attractions = (ev._embedded?.attractions || [])
        .map((a) => a.name)
        .filter(Boolean);

      if (!festivals.has(key)) {
        festivals.set(key, {
          name,
          slug: slugify(name),
          country: countryName,
          city: venue.city?.name?.trim() ?? null,
          venue_name: venue.name ?? null,
          latitude: Number(venue.location.latitude),
          longitude: Number(venue.location.longitude),
          image_url: image,
          website_url: null,
          ticket_url: ev.url ?? null,
          category,
          dates: new Map(), // date -> Set(artist)
        });
      }
      const f = festivals.get(key);
      if (!f.image_url && image) f.image_url = image;
      if (!f.ticket_url && ev.url) f.ticket_url = ev.url;
      if (date) {
        if (!f.dates.has(date)) f.dates.set(date, new Set());
        attractions.forEach((a) => f.dates.get(date).add(a));
      }
    }
  }
}

// Rank: prefer festivals with more dates / lineup detail, cap at MAX_FESTIVALS.
const all = [...festivals.values()]
  .sort((a, b) => b.dates.size - a.dates.size)
  .slice(0, MAX_FESTIVALS);

// Ensure unique slugs across the final set.
const usedSlugs = new Set();
for (const f of all) {
  let slug = f.slug || "festival";
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${f.slug}-${n++}`;
  usedSlugs.add(slug);
  f.slug = slug;
}

const esc = (v) => String(v).replace(/'/g, "''");
const sqlStr = (v) => (v == null || v === "" ? "null" : `'${esc(v)}'`);

let sql = `-- Auto-generated by scripts/fetch-festivals.mjs (Ticketmaster Discovery API)\n`;
sql += `-- ${all.length} festivals\n\n`;

// festivals
sql += `insert into festivals (slug, name, city, country, venue_name, website_url, image_url, category, latitude, longitude) values\n`;
sql += all
  .map(
    (f) =>
      `  (${sqlStr(f.slug)}, ${sqlStr(f.name)}, ${sqlStr(f.city)}, ${sqlStr(f.country)}, ` +
      `${sqlStr(f.venue_name)}, ${sqlStr(f.website_url)}, ${sqlStr(f.image_url)}, ` +
      `${sqlStr(f.category)}, ${f.latitude}, ${f.longitude})`,
  )
  .join(",\n");
sql += `\non conflict (slug) do nothing;\n\n`;

// ticket_links
const ticketRows = all.filter((f) => f.ticket_url);
if (ticketRows.length) {
  sql += `insert into ticket_links (festival_id, provider, url)\nselect f.id, v.provider, v.url from (values\n`;
  sql += ticketRows
    .map((f) => `  (${sqlStr(f.slug)}, 'Ticketmaster', ${sqlStr(f.ticket_url)})`)
    .join(",\n");
  sql += `\n) as v(slug, provider, url)\njoin festivals f on f.slug = v.slug;\n\n`;
}

// festival_dates
const dateRows = [];
for (const f of all) for (const d of f.dates.keys()) dateRows.push([f.slug, d]);
if (dateRows.length) {
  sql += `insert into festival_dates (festival_id, date)\nselect f.id, v.date::date from (values\n`;
  sql += dateRows.map(([slug, d]) => `  (${sqlStr(slug)}, ${sqlStr(d)})`).join(",\n");
  sql += `\n) as v(slug, date)\njoin festivals f on f.slug = v.slug\non conflict (festival_id, date) do nothing;\n\n`;
}

// artists
const allArtists = new Set();
for (const f of all) for (const set of f.dates.values()) for (const a of set) allArtists.add(a);
if (allArtists.size) {
  sql += `insert into artists (name) values\n`;
  sql += [...allArtists].map((a) => `  (${sqlStr(a)})`).join(",\n");
  sql += `\non conflict (name) do nothing;\n\n`;
}

// performances
const perfRows = [];
for (const f of all)
  for (const [d, set] of f.dates) for (const a of set) perfRows.push([f.slug, d, a]);
if (perfRows.length) {
  sql += `insert into performances (festival_date_id, artist_id)\nselect fd.id, ar.id from (values\n`;
  sql += perfRows
    .map(([slug, d, a]) => `  (${sqlStr(slug)}, ${sqlStr(d)}, ${sqlStr(a)})`)
    .join(",\n");
  sql += `\n) as v(slug, date, artist_name)
join festivals f on f.slug = v.slug
join festival_dates fd on fd.festival_id = f.id and fd.date = v.date::date
join artists ar on ar.name = v.artist_name
on conflict (festival_date_id, artist_id, stage) do nothing;\n`;
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed_europe.sql");
writeFileSync(outPath, sql);
console.error(
  `\nWrote ${all.length} festivals, ${dateRows.length} dates, ${allArtists.size} artists to supabase/seed_europe.sql`,
);
