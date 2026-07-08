#!/usr/bin/env node
/**
 * Adds Ticketmaster festivals to the registry as a SECOND source — but only the
 * ones not already covered by Wikidata (deduped by name + location). New rows
 * are tagged source='ticketmaster' and come with dates/lineup/tickets.
 *
 * Usage:
 *   TM_API_KEY=your_key node --env-file=.env.local scripts/fetch-ticketmaster-registry.mjs
 *
 * Reads existing festivals from Supabase (read-only) for dedup, then writes
 * supabase/seed_tm_registry.sql for you to run in the SQL editor.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TM_KEY = process.env.TM_API_KEY;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!TM_KEY || !SB_URL || !SB_KEY) {
  console.error("Need TM_API_KEY (env) and NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (--env-file=.env.local)");
  process.exit(1);
}

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGES_PER_COUNTRY = 3;
const DEDUP_KM = 40;

const COUNTRIES = {
  NO: "Norge", SE: "Sverige", DK: "Danmark", FI: "Finland", IS: "Island",
  GB: "Storbritannia", IE: "Irland", NL: "Nederland", BE: "Belgia",
  DE: "Tyskland", FR: "Frankrike", ES: "Spania", PT: "Portugal",
  IT: "Italia", CH: "Sveits", AT: "Østerrike", PL: "Polen", CZ: "Tsjekkia",
  HU: "Ungarn", HR: "Kroatia", RO: "Romania", GR: "Hellas",
};

const TICKET_NOISE =
  /\b(pass(\s+vip)?|vip|forfait|billet(s|terie)?|ticket(s)?|navette|shuttle|camping|glamping|parking|entr[ée]e|de\s*luxe|deluxe|jour\s*\d+|\d+\s*jours?|day\s*\d+|dag\s*\d+|weekend|1\s*jour|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/gi;

function titleCaseIfShouting(s) {
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function cleanName(name) {
  const parts = name
    .split(/\s*[-–—|:]\s*/)
    .map((p) =>
      p.replace(/\b20\d{2}\b/g, " ").replace(TICKET_NOISE, " ").replace(/\s{2,}/g, " ").trim(),
    )
    .filter((p) => p && !/^[\d&+,.\s]*$/.test(p) && !/^\(.*\)$/.test(p));
  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) { seen.add(k); unique.push(p); }
  }
  return titleCaseIfShouting(
    unique.join(" - ").replace(/\s{2,}/g, " ").replace(/\s*[-–—|:]\s*$/, "").trim(),
  );
}

function slugify(s) {
  return s
    .toLowerCase().replace(/&/g, " og ")
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "a")
    .replace(/ö/g, "o").replace(/ä/g, "a").replace(/ü/g, "u").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function normalize(s) {
  return (s || "")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(festival|festivalen|fest|open air|openair)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function mapCategory(genre, subGenre, name) {
  const g = ((genre || "") + " " + (subGenre || "") + " " + (name || "")).toLowerCase();
  if (/techno|house|trance|drum and bass|dubstep/.test(g)) return "Techno & House";
  if (/metal/.test(g)) return "Metal";
  if (/punk|hardcore/.test(g)) return "Punk & Hardcore";
  if (/indie/.test(g)) return "Indie";
  if (/rock/.test(g)) return "Rock & Alternativ";
  if (/hip-?hop|rap/.test(g)) return "Hip-Hop & R&B";
  if (/r&b/.test(g)) return "Hip-Hop & R&B";
  if (/electronic|dance|edm/.test(g)) return "Elektronisk & Dans";
  if (/jazz|blues|soul|funk/.test(g)) return "Jazz & Soul";
  if (/classical|opera/.test(g)) return "Klassisk";
  if (/folk|country|americana/.test(g)) return "Folk & Americana";
  if (/reggae|world|latin|ska/.test(g)) return "Reggae & World";
  if (/pop/.test(g)) return "Pop & Mainstream";
  return "Blandet/Flersjanger";
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getExisting() {
  const res = await fetch(
    `${SB_URL}/rest/v1/festivals?select=name,latitude,longitude&limit=5000`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({ norm: normalize(r.name), lat: r.latitude, lng: r.longitude }));
}

async function fetchPage(code, page) {
  const url =
    `${TM_BASE}?apikey=${TM_KEY}&classificationName=music&keyword=festival` +
    `&countryCode=${code}&size=200&page=${page}&locale=*`;
  const res = await fetch(url);
  if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); return fetchPage(code, page); }
  if (!res.ok) return [];
  return (await res.json())?._embedded?.events ?? [];
}

const existing = await getExisting();
console.error(`Loaded ${existing.length} existing festivals for dedup.`);

function isDuplicate(norm, lat, lng) {
  if (!norm) return false;
  for (const e of existing) {
    if (!e.norm) continue;
    const nameHit = e.norm === norm || e.norm.includes(norm) || norm.includes(e.norm);
    if (nameHit && distanceKm(lat, lng, e.lat, e.lng) < DEDUP_KM) return true;
  }
  return false;
}

const festivals = new Map();

for (const [code, countryName] of Object.entries(COUNTRIES)) {
  process.stderr.write(`${code} (${countryName})… `);
  let found = 0;
  for (let page = 0; page < PAGES_PER_COUNTRY; page++) {
    let events = [];
    try { events = await fetchPage(code, page); } catch { break; }
    if (events.length === 0) break;

    for (const ev of events) {
      if (!/fest/i.test(ev.name || "")) continue;
      const name = cleanName(ev.name || "");
      if (!name) continue;
      const venue = ev._embedded?.venues?.[0];
      if (!venue?.location?.latitude || !venue?.location?.longitude) continue;
      if (venue.country?.countryCode !== code) continue;

      const lat = Number(venue.location.latitude);
      const lng = Number(venue.location.longitude);
      const key = `${slugify(name)}::${code}`;
      const date = ev.dates?.start?.localDate ?? null;
      const attractions = (ev._embedded?.attractions || []).map((a) => a.name).filter(Boolean);
      const cls = ev.classifications?.[0];
      const image =
        (ev.images || []).filter((i) => i.width >= 640).sort((a, b) => b.width - a.width)[0]?.url ?? null;

      if (!festivals.has(key)) {
        festivals.set(key, {
          name, slug: slugify(name), country: countryName,
          city: venue.city?.name?.trim() ?? null, venue_name: venue.name ?? null,
          lat, lng, image_url: image, ticket_url: ev.url ?? null,
          category: mapCategory(cls?.genre?.name, cls?.subGenre?.name, name),
          norm: normalize(name), dates: new Map(),
        });
      }
      const f = festivals.get(key);
      if (!f.image_url && image) f.image_url = image;
      if (!f.ticket_url && ev.url) f.ticket_url = ev.url;
      if (date) {
        if (!f.dates.has(date)) f.dates.set(date, new Set());
        attractions.forEach((a) => { if (normalize(a) !== f.norm) f.dates.get(date).add(a); });
      }
    }
  }
  found = [...festivals.values()].filter((f) => f.country === countryName).length;
  process.stderr.write(`${found} candidates so far\n`);
}

// Drop duplicates of festivals already in the registry.
const netNew = [...festivals.values()].filter((f) => !isDuplicate(f.norm, f.lat, f.lng));

// Unique slugs within batch.
const used = new Set();
for (const f of netNew) {
  let slug = f.slug || "festival";
  let n = 2;
  while (used.has(slug)) slug = `${f.slug}-${n++}`;
  used.add(slug);
  f.slug = slug;
}

const esc = (v) => String(v).replace(/'/g, "''");
const sqlStr = (v) => (v == null || v === "" ? "null" : `'${esc(v)}'`);

let sql = `-- Auto-generated by scripts/fetch-ticketmaster-registry.mjs\n`;
sql += `-- ${netNew.length} net-new Ticketmaster festivals (not already in the registry)\n\n`;

sql += `insert into festivals (slug, name, city, country, venue_name, image_url, category, latitude, longitude, source, external_id) values\n`;
sql += netNew
  .map(
    (f) =>
      `  (${sqlStr(f.slug)}, ${sqlStr(f.name)}, ${sqlStr(f.city)}, ${sqlStr(f.country)}, ` +
      `${sqlStr(f.venue_name)}, ${sqlStr(f.image_url)}, ${sqlStr(f.category)}, ${f.lat}, ${f.lng}, ` +
      `'ticketmaster', ${sqlStr(f.slug)})`,
  )
  .join(",\n");
sql += `\non conflict (slug) do nothing;\n\n`;

const ticketRows = netNew.filter((f) => f.ticket_url);
if (ticketRows.length) {
  sql += `insert into ticket_links (festival_id, provider, url)\nselect fest.id, 'Ticketmaster', v.url from (values\n`;
  sql += ticketRows.map((f) => `  (${sqlStr(f.slug)}, ${sqlStr(f.ticket_url)})`).join(",\n");
  sql += `\n) as v(slug, url)\njoin festivals fest on fest.slug = v.slug\nwhere not exists (select 1 from ticket_links tl where tl.festival_id = fest.id and tl.provider = 'Ticketmaster');\n\n`;
}

const dateRows = [];
for (const f of netNew) for (const d of f.dates.keys()) dateRows.push([f.slug, d]);
if (dateRows.length) {
  sql += `insert into festival_dates (festival_id, date)\nselect fest.id, v.date::date from (values\n`;
  sql += dateRows.map(([slug, d]) => `  (${sqlStr(slug)}, ${sqlStr(d)})`).join(",\n");
  sql += `\n) as v(slug, date)\njoin festivals fest on fest.slug = v.slug\non conflict (festival_id, date) do nothing;\n\n`;
}

const artists = new Set();
for (const f of netNew) for (const s of f.dates.values()) for (const a of s) artists.add(a);
if (artists.size) {
  sql += `insert into artists (name) values\n`;
  sql += [...artists].map((a) => `  (${sqlStr(a)})`).join(",\n");
  sql += `\non conflict (name) do nothing;\n\n`;
}

const perfRows = [];
for (const f of netNew) for (const [d, s] of f.dates) for (const a of s) perfRows.push([f.slug, d, a]);
if (perfRows.length) {
  sql += `insert into performances (festival_date_id, artist_id)\nselect fd.id, ar.id from (values\n`;
  sql += perfRows.map(([slug, d, a]) => `  (${sqlStr(slug)}, ${sqlStr(d)}, ${sqlStr(a)})`).join(",\n");
  sql += `\n) as v(slug, date, artist_name)
join festivals fest on fest.slug = v.slug
join festival_dates fd on fd.festival_id = fest.id and fd.date = v.date::date
join artists ar on ar.name = v.artist_name
on conflict (festival_date_id, artist_id, stage) do nothing;\n`;
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed_tm_registry.sql");
writeFileSync(outPath, sql);
console.error(
  `\n${festivals.size} TM candidates → ${netNew.length} net-new after dedup. Wrote supabase/seed_tm_registry.sql`,
);
