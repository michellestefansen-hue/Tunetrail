#!/usr/bin/env node
/**
 * Builds the canonical European festival registry from Wikidata (the stable
 * identity + location layer) and writes supabase/seed_wikidata.sql.
 *
 * Usage:  node scripts/fetch-wikidata.mjs
 *
 * No API key needed. Queries the Wikidata Query Service per country for
 * entities that are (a subclass of) "music festival" with coordinates, and
 * captures name, country, city, official website, genre and image.
 * Dates/lineups are intentionally NOT sourced here — those come from the
 * Ticketmaster enrichment pass, since they change every edition.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "Tunetrail/1.0 (European festival map; github.com/michellestefansen-hue/Tunetrail)";

// Wikidata country QID -> Norwegian country name for the `country` column.
const COUNTRIES = {
  Q20: "Norge", Q34: "Sverige", Q35: "Danmark", Q33: "Finland", Q189: "Island",
  Q145: "Storbritannia", Q27: "Irland", Q55: "Nederland", Q31: "Belgia",
  Q183: "Tyskland", Q142: "Frankrike", Q29: "Spania", Q45: "Portugal",
  Q38: "Italia", Q39: "Sveits", Q40: "Østerrike", Q36: "Polen", Q213: "Tsjekkia",
  Q28: "Ungarn", Q224: "Kroatia", Q218: "Romania", Q41: "Hellas",
  Q215: "Slovenia", Q214: "Slovakia", Q191: "Estland", Q211: "Latvia",
  Q37: "Litauen", Q403: "Serbia", Q219: "Bulgaria", Q32: "Luxembourg",
  Q233: "Malta", Q236: "Montenegro", Q222: "Albania", Q221: "Nord-Makedonia",
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " og ")
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "a")
    .replace(/ö/g, "o").replace(/ä/g, "a").replace(/ü/g, "u").replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function mapCategory(genres, name = "") {
  // Fall back to name-based inference since most Wikidata items lack a genre tag.
  const g = (genres.join(" ") + " " + name).toLowerCase();
  if (/techno|house|trance|drum and bass|dubstep/.test(g)) return "Techno & House";
  if (/metal/.test(g)) return "Metal";
  if (/punk|hardcore/.test(g)) return "Punk & Hardcore";
  if (/indie/.test(g)) return "Indie";
  if (/rock/.test(g)) return "Rock & Alternativ";
  if (/hip hop|hip-hop|rap/.test(g)) return "Hip-Hop & R&B";
  if (/r&b|rhythm and blues/.test(g)) return "Hip-Hop & R&B";
  if (/electronic|edm|dance/.test(g)) return "Elektronisk & Dans";
  if (/jazz|blues|soul|funk/.test(g)) return "Jazz & Soul";
  if (/classical|opera|orchestr/.test(g)) return "Klassisk";
  if (/folk|country|americana|bluegrass/.test(g)) return "Folk & Americana";
  if (/reggae|world|ska|latin/.test(g)) return "Reggae & World";
  if (/pop/.test(g)) return "Pop & Mainstream";
  return "Blandet/Flersjanger";
}

function query(qid) {
  return `SELECT ?f ?fLabel ?coord ?website ?locationLabel ?genreLabel ?image WHERE {
  ?f wdt:P31/wdt:P279* wd:Q868557 .
  ?f wdt:P17 wd:${qid} .
  ?f wdt:P625 ?coord .
  OPTIONAL { ?f wdt:P856 ?website. }
  OPTIONAL { ?f wdt:P276 ?location. }
  OPTIONAL { ?f wdt:P136 ?genre. }
  OPTIONAL { ?f wdt:P18 ?image. }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,no,de,fr,es,it,nl,da,sv" .
    ?f rdfs:label ?fLabel . ?location rdfs:label ?locationLabel . ?genre rdfs:label ?genreLabel .
  }
}`;
}

async function runQuery(qid) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query(qid))}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 3000));
    return runQuery(qid);
  }
  if (!res.ok) {
    console.warn(`  ${qid}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.results.bindings;
}

function parseCoord(wkt) {
  // "Point(10.75 59.91)" -> [lng, lat]
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt || "");
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

const byQid = new Map();

for (const [qid, countryName] of Object.entries(COUNTRIES)) {
  process.stderr.write(`Wikidata ${qid} (${countryName})… `);
  let rows = [];
  try {
    rows = await runQuery(qid);
  } catch (err) {
    console.warn(`failed: ${err.message}`);
    continue;
  }
  process.stderr.write(`${rows.length} rows\n`);

  for (const r of rows) {
    const id = r.f.value.split("/").pop(); // Q-number
    const name = r.fLabel?.value?.trim();
    if (!name || /^Q\d+$/.test(name)) continue; // skip unlabelled
    if (/\b(19|20)\d{2}\b/.test(name)) continue; // skip single-edition items

    if (!byQid.has(id)) {
      const coord = parseCoord(r.coord?.value);
      if (!coord) continue;
      byQid.set(id, {
        external_id: id,
        name,
        slug: slugify(name),
        country: countryName,
        city:
          r.locationLabel?.value && !/^Q\d+$/.test(r.locationLabel.value)
            ? r.locationLabel.value.trim()
            : null,
        website_url: r.website?.value || null,
        image_url: r.image?.value ? `${r.image.value}?width=1000` : null,
        coord,
        genres: new Set(),
      });
    }
    if (r.genreLabel?.value) byQid.get(id).genres.add(r.genreLabel.value);
  }

  await new Promise((r) => setTimeout(r, 400)); // be gentle with WDQS
}

const all = [...byQid.values()];

// Unique slugs within the batch.
const used = new Set();
for (const f of all) {
  let slug = f.slug || "festival";
  let n = 2;
  while (used.has(slug)) slug = `${f.slug}-${n++}`;
  used.add(slug);
  f.slug = slug;
  f.category = mapCategory([...f.genres], f.name);
}

const esc = (v) => String(v).replace(/'/g, "''");
const sqlStr = (v) => (v == null || v === "" ? "null" : `'${esc(v)}'`);

let sql = `-- Auto-generated by scripts/fetch-wikidata.mjs (Wikidata Query Service)\n`;
sql += `-- ${all.length} European festivals (canonical registry)\n\n`;
sql += `insert into festivals (slug, name, city, country, website_url, image_url, category, latitude, longitude, source, external_id) values\n`;
sql += all
  .map(
    (f) =>
      `  (${sqlStr(f.slug)}, ${sqlStr(f.name)}, ${sqlStr(f.city)}, ${sqlStr(f.country)}, ` +
      `${sqlStr(f.website_url)}, ${sqlStr(f.image_url)}, ${sqlStr(f.category)}, ` +
      `${f.coord?.[1] ?? "null"}, ${f.coord?.[0] ?? "null"}, 'wikidata', ${sqlStr(f.external_id)})`,
  )
  .join(",\n");
sql += `\non conflict (slug) do nothing;\n`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed_wikidata.sql");
writeFileSync(outPath, sql);

// category distribution for a quick quality read
const dist = {};
for (const f of all) dist[f.category] = (dist[f.category] || 0) + 1;
console.error(`\nWrote ${all.length} festivals to supabase/seed_wikidata.sql`);
console.error("Category distribution:", JSON.stringify(dist, null, 0));
