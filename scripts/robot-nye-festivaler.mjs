#!/usr/bin/env node
/**
 * Hendene til jobben som leter etter nye festivaler. Hodet er Claude Code --
 * se .claude/skills/nattlig-nye-festivaler/SKILL.md.
 *
 * Alt leses med anon-nøkkelen (festivalsider, geokoder, bilder, festivallista).
 * Den ENESTE skrivingen er `send`: den legger et forslag i godkjenningskøen,
 * aldri rett i festivaltabellen, og bare når kandidaten er `klar`. Databasen
 * (robot_new_festival_problem i 20261118_robot_may_propose_festivals.sql)
 * sjekker det samme én gang til, og tar tak på tre per døgn og fem i køen.
 * Ingenting blir en festival før et menneske har godkjent det i /admin.
 *
 * Prinsippet er at INTET FELT STÅR UTEN BEVIS. Roboten skriver aldri
 * koordinater, bilde-adresser eller datoer fra hukommelsen: de kommer fra et
 * verktøy her, og forslaget oppgir hvor. Det eneste roboten får gjette, er
 * det en festivalside sjelden sier rett ut -- størrelse, hovedsjanger, tagger,
 * undersjanger -- og da må hver gjetning stå i notatet med hva den bygger på.
 *
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs sjekk
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs les <adresse> [--tekst=6000]
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs geokode "<søk>" [--land=de]
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs bilde <adresse>
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs kjenner <kandidat.json>
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs bygg <kandidat.json> [--uten-nett]
 *   node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs send <kandidat.json>
 *
 * Krever NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY. `send`
 * krever i tillegg SUPABASE_SERVICE_ROLE_KEY, og bruker den bare til å finne
 * robotprofilen og legge én rad i køen. Valgfritt: TUNETRAIL_KONTAKT (en e-postadresse eller
 * nettside) legges inn i User-Agent, slik geokoderen kan nå oss. Settes i
 * .env.local, aldri i koden.
 */

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Finner .env.local også fra en arbeidskopi. Se miljo.mjs.
import "./miljo.mjs";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Bare for `send`. Går forbi all tilgangskontroll, så den brukes ett sted:
// tilKoen(), som bare kan legge en festival_new i køen.
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KONTAKT = process.env.TUNETRAIL_KONTAKT;

// Ærlig om at vi er en robot, som festivalvaktene. Kontakten er valgfri og
// kommer fra miljøet, ikke fra koden.
const USER_AGENT = `TunetrailNyeFestivaler/1.0 (+https://tune-trail.org${KONTAKT ? `; kontakt: ${KONTAKT}` : ""})`;

const FETCH_TIMEOUT_MS = 15000;
const MIN_BILDEBREDDE = 800;
const MAKS_DAGER = 60;

/* ------------------------------------------------------------ ordlistene -- */
// Kopier av src/lib/festivals.ts og supabase/migrations/20260703020000_
// add_festival_category.sql. Skriptet kjører utenfor Next-appen og kan ikke
// importere dem. At de ikke driver fra hverandre, avgjøres av en test som
// leser de to filene.

export const SIZE_BANDS = ["under_200", "200_2000", "2000_10000", "10000_50000", "50000_100000", "over_100000"];

export const TAGS = [
  "Rock", "Metal", "Punk & Hardcore", "Alternativ & Indie", "Pop & Mainstream",
  "Elektronisk & Dans", "Techno & House", "Hip-Hop & R&B", "Jazz", "Blues",
  "Soul & Funk", "Klassisk", "Folk & Americana", "Verden & Reggae",
];

export const CATEGORIES = [
  "Rock & Metal", "Pop & Mainstream", "Elektronisk & Dans",
  "Hip-Hop & R&B", "Folk & Vise", "Blandet/Flersjanger",
];

export const SUBGENRES = [
  "techno", "house", "trance", "hardstyle", "dnb", "psytrance", "edm", "ambient", "disco",
  "death_metal", "black_metal", "doom_stoner", "thrash", "power_prog", "metalcore",
  "goth_industrial", "punk", "classic_rock", "indie_alt",
];

// Landnavnene slik basen skriver dem, med landkoden geokoderen svarer med.
// Brukes til å se at koordinatene faktisk ligger i landet forslaget oppgir.
export const LAND_ISO = {
  Norge: "no", Sverige: "se", Danmark: "dk", Finland: "fi", Island: "is",
  Storbritannia: "gb", Irland: "ie", Nederland: "nl", Belgia: "be",
  Tyskland: "de", Frankrike: "fr", Spania: "es", Portugal: "pt", Italia: "it",
  Sveits: "ch", Østerrike: "at", Polen: "pl", Tsjekkia: "cz", Ungarn: "hu",
  Kroatia: "hr", Romania: "ro", Hellas: "gr", Slovenia: "si", Slovakia: "sk",
  Estland: "ee", Latvia: "lv", Litauen: "lt", Serbia: "rs", Bulgaria: "bg",
  Luxembourg: "lu", Malta: "mt", Montenegro: "me", Albania: "al",
  "Nord-Makedonia": "mk",
};

// Europa med øyer (Kanariøyene, Madeira, Azorene, Island) og litt slingring.
const EUROPA = { latMin: 27, latMax: 72, lonMin: -32, lonMax: 45 };

// Sider som aldri er festivalens egen. En festival kan ha en Facebook-side, men
// den er ikke nettstedet vi kan etterprøve noe mot.
const IKKE_EGET_NETTSTED = /(^|\.)(facebook|instagram|twitter|x|tiktok|youtube|linktr|eventbrite|ra|songkick|bandsintown|ticketmaster|wikipedia|google)\./i;

/* -------------------------------------------------------- små hjelpere --- */

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const sovn = (ms) => new Promise((r) => setTimeout(r, ms));

function flag(args, name) {
  const hit = args.find((a) => a === name || a.startsWith(`${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(name.length + 1) : true;
}

const positional = (args) => args.filter((a) => !a.startsWith("--"));

async function hent(url, { fetchImpl = fetch, headers = {}, ...rest } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, ...headers },
      ...rest,
    });
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------- duplikater --- */
// Samme logikk som src/lib/duplicates.ts, som er den godkjenningssiden din
// bruker. Å ha en annen mening her ville gjort at roboten slipper gjennom noe
// du ser på som duplikat, eller omvendt.

const STOY = new Set([
  "festival", "festivalen", "fest", "open", "air", "openair", "music", "musikk", "musik",
  "the", "de", "det", "la", "le", "el", "los", "les", "international", "internasjonal",
]);
const BOKSTAVER = { ø: "o", æ: "ae", å: "a", ð: "d", þ: "th", ß: "ss", ł: "l", đ: "d" };

export function dupKey(raw, ekstra = []) {
  const slipp = new Set([...STOY, ...ekstra.map((w) => w.toLowerCase())]);
  const ord = String(raw)
    .toLowerCase()
    .replace(/[øæåðþßłđ]/g, (c) => BOKSTAVER[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !slipp.has(w));
  return (ord.length ? ord : String(raw).toLowerCase().split(/\s+/)).sort().join(" ");
}

export function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const r = (d) => (d * Math.PI) / 180;
  const dLat = r(b[0] - a[0]);
  const dLon = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Festivalene vi allerede har som kan være den samme. Tre måter å være det på:
 * samme nettsted (sterkest), samme navn, eller i nærheten i samme land.
 * Treff rangeres og filtreres ikke: et falskt treff koster et blikk, et
 * ubemerket duplikat koster basen en rad.
 */
export function findDuplicates(input, alle) {
  const steder = [input.city, ...alle.map((c) => c.city)].filter(Boolean);
  const stedsord = new Set(steder.flatMap((p) => dupKey(p).split(" ")).filter((w) => w.length > 2));

  const key = dupKey(input.name);
  const unikt = dupKey(input.name, [...stedsord]).split(" ").filter(Boolean);
  const vert = hostOf(input.website);

  const treff = { website: [], exact: [], loose: [] };
  for (const c of alle) {
    if (vert && hostOf(c.website_url) === vert) {
      treff.website.push({ ...c, reason: "website", exact: true });
      continue;
    }
    const ck = dupKey(c.name);
    if (ck === key) {
      treff.exact.push({ ...c, reason: "name", exact: true });
      continue;
    }
    const cUnikt = dupKey(c.name, [...stedsord]).split(" ").filter(Boolean);
    const kort = unikt.length <= cUnikt.length ? unikt : cUnikt;
    const lang = kort === unikt ? cUnikt : unikt;
    if (kort.length > 0 && lang.length > 0 && kort.every((w) => lang.includes(w))) {
      treff.loose.push({ ...c, reason: "name", exact: false });
      continue;
    }
    if (
      input.country &&
      c.country === input.country &&
      c.latitude != null &&
      distanceKm(input.coords, [Number(c.latitude), Number(c.longitude ?? 0)]) < 10
    ) {
      treff.loose.push({ ...c, reason: "nearby", exact: false });
    }
  }
  return [...treff.website, ...treff.exact, ...treff.loose].slice(0, 5);
}

/* --------------------------------------------------------- bildesjekk --- */

/** Bredde og høyde fra de første bytene i bildet, uten å laste alt ned. */
export function imageDimensions(buf) {
  const b = Buffer.from(buf);
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { format: "png", width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  if (b.length >= 10 && b.toString("latin1", 0, 4) === "GIF8") {
    return { format: "gif", width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  }
  if (b.length >= 30 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    const kind = b.toString("latin1", 12, 16);
    if (kind === "VP8 ") {
      return { format: "webp", width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    }
    if (kind === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === "VP8X") {
      return { format: "webp", width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    }
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; }
      // SOF0..SOF15, bortsett fra DHT (C4), JPG (C8) og DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { format: "jpeg", height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/**
 * Er dette et bilde vi kan bruke? Svarer med problemer (stopper) og advarsler
 * (et menneske bør se på det). Leser bare de første 64 KB.
 */
export async function checkImage(url, { fetchImpl = fetch } = {}) {
  const problems = [];
  const warnings = [];
  let u;
  try { u = new URL(url); } catch { return { ok: false, problems: ["Adressen er ikke en gyldig nettadresse."], warnings }; }
  if (u.protocol !== "https:") problems.push("Bildet må ligge på https. Ellers blokkerer nettleseren det på en https-side.");

  let res;
  try {
    res = await hent(url, { fetchImpl, headers: { accept: "image/*", range: "bytes=0-65535" } });
  } catch (err) {
    return { ok: false, problems: [...problems, `Kunne ikke hente bildet: ${String(err.message ?? err)}`], warnings };
  }
  if (!(res.status === 200 || res.status === 206)) problems.push(`Bildet svarte HTTP ${res.status}.`);

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) problems.push(`Svaret er «${contentType || "ukjent"}», ikke et bilde.`);
  if (contentType === "image/svg+xml") problems.push("SVG er en logo eller tegning, ikke et festivalbilde.");

  let dims = null;
  if (res.body && contentType.startsWith("image/") && contentType !== "image/svg+xml") {
    const reader = res.body.getReader();
    const deler = [];
    let n = 0;
    while (n < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      deler.push(Buffer.from(value));
      n += value.length;
    }
    try { await reader.cancel(); } catch { /* allerede lukket */ }
    dims = imageDimensions(Buffer.concat(deler));
    if (!dims) warnings.push("Kunne ikke lese størrelsen på bildet. Se på det selv.");
    else if (dims.width < MIN_BILDEBREDDE) problems.push(`Bildet er ${dims.width} px bredt. Under ${MIN_BILDEBREDDE} blir det uskarpt på kortet.`);
  }

  if (/logo|favicon|icon|sprite|placeholder/i.test(u.pathname)) warnings.push("Filnavnet ser ut som en logo eller et ikon, ikke et motiv.");
  if (/[?&](expires|x-amz-signature|token|sig|signature)=/i.test(u.search)) warnings.push("Adressen ser ut til å utløpe (signatur eller token). Da slutter bildet å virke.");

  return { ok: problems.length === 0, status: res.status, contentType, ...(dims ?? {}), problems, warnings };
}

/* ------------------------------------------------------------- geokoder -- */

const NOMINATIM = "https://nominatim.openstreetmap.org";
let sistGeokode = 0;
// Nominatim tillater ett oppslag i sekundet. Å bryte det er å bli utestengt.
async function ventPaaGeokoder() {
  const vent = 1100 - (Date.now() - sistGeokode);
  if (vent > 0) await sovn(vent);
  sistGeokode = Date.now();
}

export async function geocode(sok, { land, fetchImpl = fetch, pace = ventPaaGeokoder } = {}) {
  await pace();
  const qs = new URLSearchParams({ q: sok, format: "jsonv2", addressdetails: "1", limit: "3" });
  if (land) qs.set("countrycodes", String(land).toLowerCase());
  const res = await hent(`${NOMINATIM}/search?${qs}`, { fetchImpl, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Geokoderen svarte HTTP ${res.status}.`);
  const rader = await res.json();
  return rader.map((r) => ({
    lat: Number(r.lat),
    lon: Number(r.lon),
    navn: r.display_name,
    landkode: r.address?.country_code ?? null,
    klasse: r.category ?? r.class ?? null,
    type: r.type ?? null,
    // «by» betyr at geokoderen bare fant et sted på kartet som er en by eller
    // et område, ikke selve arenaen. Punktet er da midt i byen.
    presisjon: ["place", "boundary"].includes(r.category ?? r.class) ? "by" : "sted",
  }));
}

export async function reverseCountry(lat, lon, { fetchImpl = fetch, pace = ventPaaGeokoder } = {}) {
  await pace();
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "3" });
  const res = await hent(`${NOMINATIM}/reverse?${qs}`, { fetchImpl, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Geokoderen svarte HTTP ${res.status}.`);
  const r = await res.json();
  return r.address?.country_code ?? null;
}

/* ------------------------------------------------------------ festivalside */

const BLOKK = /<\/?(p|div|section|article|header|footer|nav|ul|ol|li|h[1-6]|br|tr|table|main|aside)\b[^>]*>/gi;

function tilTekst(html) {
  return html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(BLOKK, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .normalize("NFKC")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

function meta(html, ...navn) {
  for (const n of navn) {
    const m =
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`, "i")) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`, "i"));
    if (m) return m[1].trim();
  }
  return null;
}

const ABS = (u, base) => { try { return new URL(u, base).href; } catch { return null; } };

function enBilde(img) {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return enBilde(img[0]);
  return img.url ?? img.contentUrl ?? null;
}

function flatLd(node, ut = []) {
  if (Array.isArray(node)) node.forEach((n) => flatLd(n, ut));
  else if (node && typeof node === "object") {
    if (node["@graph"]) flatLd(node["@graph"], ut);
    ut.push(node);
    for (const k of ["location", "subEvent", "superEvent", "performer"]) if (node[k] && typeof node[k] === "object") flatLd(node[k], ut);
  }
  return ut;
}

/**
 * Det festivalsiden selv sier i strukturerte data (JSON-LD), ved siden av
 * teksten. Mange festivalsider har sted, koordinater, datoer og bilde der, og
 * da slipper vi å lese dem ut av prosa.
 */
export function extractStructured(html, baseUrl) {
  const ld = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ld.push(...flatLd(JSON.parse(m[1].trim()))); } catch { /* ødelagt JSON-LD er ikke vår sak */ }
  }
  const relevante = ld
    .filter((n) => /Event|Festival|Place|MusicVenue|LocalBusiness|Organization/i.test([].concat(n["@type"] ?? []).join(" ")))
    .map((n) => {
      const adr = n.address && typeof n.address === "object" ? n.address : null;
      const geo = n.geo ?? null;
      return {
        type: [].concat(n["@type"] ?? []).join(","),
        navn: n.name ?? null,
        start: n.startDate ?? null,
        slutt: n.endDate ?? null,
        adresse: adr
          ? [adr.streetAddress, adr.postalCode, adr.addressLocality, typeof adr.addressCountry === "object" ? adr.addressCountry?.name : adr.addressCountry].filter(Boolean).join(", ")
          : typeof n.address === "string" ? n.address : null,
        lat: geo?.latitude != null ? Number(geo.latitude) : null,
        lon: geo?.longitude != null ? Number(geo.longitude) : null,
        bilde: ABS(enBilde(n.image) ?? "", baseUrl) || null,
        url: n.url ? ABS(n.url, baseUrl) : null,
      };
    })
    .filter((n) => n.navn || n.start || n.lat != null);

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const lang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] ?? null;
  const lenker = [];
  const vert = hostOf(baseUrl);
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = ABS(m[1], baseUrl);
    const tekst = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (href && hostOf(href) === vert && tekst && tekst.length < 60 && !lenker.some((l) => l.href === href)) lenker.push({ href, tekst });
  }

  return {
    tittel: title,
    sprak: lang,
    beskrivelse: meta(html, "og:description", "description"),
    og_bilde: ABS(meta(html, "og:image", "og:image:url") ?? "", baseUrl) || null,
    twitter_bilde: ABS(meta(html, "twitter:image", "twitter:image:src") ?? "", baseUrl) || null,
    canonical: ABS(html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? "", baseUrl) || null,
    strukturerte_data: relevante,
    lenker: lenker.slice(0, 40),
  };
}

export async function lesSide(url, { tekstGrense = 6000, fetchImpl = fetch } = {}) {
  const res = await hent(url, { fetchImpl, headers: { accept: "text/html,application/xhtml+xml" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const finalUrl = res.url || url;
  const tekst = tilTekst(html);
  return { adresse: finalUrl, ...extractStructured(html, finalUrl), tekst: tekst.slice(0, tekstGrense), tekst_avkortet: tekst.length > tekstGrense };
}

/* ------------------------------------------------------- kandidatsjekk --- */

const ETIKETT = {
  coordinates: "sted (koordinater)",
  dates: "datoer",
  image_url: "bilde",
  city: "by",
  country: "land",
  venue_name: "arena",
  ticket_url: "billettlenke",
  size_band: "publikumsstørrelse",
  category: "hovedsjanger",
  tags: "tagger",
  subgenres: "undersjangre",
};
const PLASSERING = new Set(["city", "country", "venue_name"]);
// Det roboten har lov til å gjette. Alt annet må ha en kilde.
const GJETTBARE = ["size_band", "category", "tags", "subgenres"];
const MIN_BEGRUNNELSE = 20;

const verdiTekst = (felt, c) =>
  felt === "coordinates" ? `${c.latitude}, ${c.longitude}`
  : felt === "dates" ? `${c.date_from} til ${c.date_to}`
  : Array.isArray(c[felt]) ? c[felt].join(", ")
  : String(c[felt]);

/** Kilden til et faktafelt: egen oppføring, eller «location» for sted. */
function kildeFor(c, felt) {
  const s = c.sources ?? {};
  return (s[felt] ?? (PLASSERING.has(felt) ? s.location : undefined) ?? "").toString().trim() || null;
}

/**
 * Er kandidaten komplett, riktig og belagt? Ren funksjon: alt som krever nett
 * (bildesjekk, geokoder, festivallista) kommer inn i `ctx`, så den kan prøves
 * uten.
 *
 * Gir tre slags innvendinger, med ulik betydning:
 *   mangler -- et felt vi må ha, men ikke har. Kandidaten kan fullføres en
 *              annen natt, og skal ikke kastes.
 *   feil    -- noe er galt, eller ikke belagt. Må rettes.
 *   blokkert -- festivalen finnes trolig allerede.
 */
export function checkCandidate(c, ctx = {}) {
  const mangler = [];
  const feil = [];
  const advarsler = [];
  const today = ctx.today ?? new Date().toISOString().slice(0, 10);
  const blokkert = (ctx.duplicates ?? []).some((d) => d.exact);

  const trenger = (felt, ok) => { if (!ok) mangler.push(felt); return ok; };

  trenger("name", String(c.name ?? "").trim().length >= 2);
  trenger("source_url", !!c.source_url);
  if (c.source_url && !hostOf(c.source_url)) feil.push("source_url er ikke en gyldig nettadresse.");

  // Nettsted: festivalens eget.
  if (trenger("website_url", !!c.website_url)) {
    const host = hostOf(c.website_url);
    if (!host || !/^https?:/.test(c.website_url)) feil.push("website_url er ikke en gyldig nettadresse.");
    else if (IKKE_EGET_NETTSTED.test(host)) feil.push(`website_url (${host}) er ikke festivalens eget nettsted. Bruk festivalens egen side.`);
  }

  // Land og by.
  if (trenger("country", !!c.country)) {
    if (ctx.countries && !ctx.countries.includes(c.country)) {
      feil.push(`Landet «${c.country}» finnes ikke i basen. Bruk nøyaktig skrivemåte, for eksempel «Tyskland». Finnes: ${ctx.countries.join(", ")}.`);
    }
  }
  trenger("city", !!String(c.city ?? "").trim());

  // Koordinater.
  const harKoord = Number.isFinite(c.latitude) && Number.isFinite(c.longitude);
  if (trenger("coordinates", harKoord)) {
    const { latMin, latMax, lonMin, lonMax } = EUROPA;
    if (c.latitude === 0 && c.longitude === 0) feil.push("Koordinatene er 0, 0. Det er ikke et sted i Europa.");
    else if (c.latitude < latMin || c.latitude > latMax || c.longitude < lonMin || c.longitude > lonMax) {
      feil.push(`Koordinatene (${c.latitude}, ${c.longitude}) ligger utenfor Europa. Er bredde og lengde byttet om?`);
    }
    if (ctx.geoCountry === undefined) advarsler.push("Landet ble ikke kontrollert mot koordinatene.");
    else if (c.country && LAND_ISO[c.country] && ctx.geoCountry && ctx.geoCountry !== LAND_ISO[c.country]) {
      feil.push(`Koordinatene ligger i «${ctx.geoCountry}», men forslaget sier ${c.country}.`);
    }
    if (ctx.geoCountry && c.country && !LAND_ISO[c.country]) advarsler.push(`Kan ikke kontrollere landet «${c.country}» mot koordinatene.`);
    if (c.location_precision === "by") advarsler.push("Punktet er midt i byen, ikke selve arenaen.");
  }

  // Datoer.
  if (trenger("dates", isDate(c.date_from) && isDate(c.date_to))) {
    if (c.date_to < c.date_from) feil.push("date_to er før date_from.");
    else {
      const dager = (Date.parse(c.date_to) - Date.parse(c.date_from)) / 86_400_000 + 1;
      if (dager > MAKS_DAGER) feil.push(`${dager} dager er ikke en festival, det er en skrivefeil.`);
    }
    if (c.date_to < today) feil.push(`Datoene (${c.date_from}–${c.date_to}) er i fortiden. Vi vil ha kommende utgaver.`);
    if (c.dates_status === "forelopig") advarsler.push("Datoene er foreløpige.");
  }

  // Bilde.
  if (trenger("image_url", !!c.image_url)) {
    if (!/^https:\/\//i.test(c.image_url)) feil.push("image_url må være en https-adresse.");
    if (ctx.imageInfo === undefined) advarsler.push("Bildet ble ikke sjekket.");
    else {
      for (const p of ctx.imageInfo.problems ?? []) feil.push(`Bilde: ${p}`);
      for (const w of ctx.imageInfo.warnings ?? []) advarsler.push(`Bilde: ${w}`);
    }
  }

  // Valgfrie fakta, men har de en verdi må de ha en kilde.
  for (const felt of ["venue_name", "ticket_url"]) {
    if (String(c[felt] ?? "").trim() && !kildeFor(c, felt)) feil.push(`${ETIKETT[felt]} er oppgitt uten kilde. Si hvor på siden den står.`);
  }
  if (c.ticket_url && !/^https?:\/\//i.test(c.ticket_url)) feil.push("ticket_url er ikke en gyldig nettadresse.");

  // Hvert faktafelt som ER med må vise hvor det kom fra.
  for (const felt of ["coordinates", "dates", "image_url"]) {
    if (!mangler.includes(felt) && !kildeFor(c, felt)) feil.push(`${ETIKETT[felt]} mangler kilde. Si hvor på siden eller hvilket verktøy det kom fra.`);
  }
  for (const felt of ["city", "country"]) {
    if (!mangler.includes(felt) && !kildeFor(c, felt)) feil.push(`${ETIKETT[felt]} mangler kilde. Sett «location» i sources, eller «${felt}».`);
  }

  // De gjettbare: kilde ELLER gjetning med begrunnelse. Aldri ingenting.
  const gjetninger = [];
  const sjekkListe = {
    size_band: { gyldig: SIZE_BANDS },
    category: { gyldig: CATEGORIES },
    tags: { gyldig: TAGS },
    subgenres: { gyldig: SUBGENRES },
  };
  for (const felt of GJETTBARE) {
    const verdi = c[felt];
    const finnes = Array.isArray(verdi) ? verdi.length > 0 : !!verdi;
    if (!finnes) {
      if (felt !== "subgenres") mangler.push(felt);
      continue;
    }
    const liste = sjekkListe[felt].gyldig;
    const ugyldige = [].concat(verdi).filter((v) => !liste.includes(v));
    if (ugyldige.length) feil.push(`${ETIKETT[felt]}: «${ugyldige.join("», «")}» finnes ikke i lista. Gyldige: ${liste.join(", ")}.`);
    if (felt === "tags" && verdi.length > 5) advarsler.push("Mange tagger. Tagger sier hvilke sjangre som forekommer, ikke hva festivalen er.");

    const kilde = kildeFor(c, felt);
    const gjetning = c.guesses?.[felt];
    if (gjetning) {
      const basis = String(gjetning.basis ?? "").trim();
      if (basis.length < MIN_BEGRUNNELSE) {
        feil.push(`Gjetningen på ${ETIKETT[felt]} har for tynn begrunnelse. Skriv hva den bygger på (minst ${MIN_BEGRUNNELSE} tegn), for eksempel hvilke artister eller hvilken kapasitet.`);
      } else {
        gjetninger.push({ felt, verdi, basis });
      }
    } else if (!kilde) {
      feil.push(`${ETIKETT[felt]} er hverken belagt eller merket som gjetning. Legg den i guesses med en begrunnelse, eller i sources med en kilde.`);
    }
  }

  const gjettet = new Set(gjetninger.map((g) => g.felt));
  const note = composeNote(c, gjetninger, gjettet);

  const confidence = c.confidence === "low" || c.dates_status === "forelopig" || c.location_precision === "by" ? "low" : "high";

  const payload = {
    name: String(c.name ?? "").trim(),
    country: c.country ?? null,
    city: c.city ?? null,
    venue_name: c.venue_name ?? null,
    website_url: c.website_url ?? null,
    ticket_url: c.ticket_url ?? null,
    description: c.description ?? null,
    image_url: c.image_url ?? null,
    tags: c.tags ?? [],
    category: c.category ?? null,
    subgenres: c.subgenres?.length ? c.subgenres : null,
    size_band: c.size_band ?? null,
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
    date_from: c.date_from ?? null,
    date_to: c.date_to ?? null,
    program: [],
    // Med i selve forslaget, ikke bare i notatet, slik at en senere visning kan
    // vise gjetningene som egne merker.
    guesses: Object.fromEntries(gjetninger.map((g) => [g.felt, g.basis])),
    sources: c.sources ?? {},
  };

  return {
    klar: mangler.length === 0 && feil.length === 0 && !blokkert,
    komplett: mangler.length === 0,
    blokkert,
    mangler,
    feil,
    advarsler,
    gjetninger,
    duplikater: ctx.duplicates ?? [],
    confidence,
    note,
    payload,
  };
}

/**
 * Notatet som følger forslaget i køen. Det er det eneste du har å gå på når du
 * avgjør om du skal stole på en festival roboten fant selv, så det sier tydelig
 * hva som er lest fra siden og hva som er gjettet, og hva gjetningen bygger på.
 */
export function composeNote(c, gjetninger, gjettet = new Set(gjetninger.map((g) => g.felt))) {
  const linjer = [];
  if (c.note) linjer.push(String(c.note).trim(), "");
  linjer.push(`Funnet på: ${c.source_url ?? "(ukjent)"}`, "", "HENTET FRA SIDEN:");
  const fakta = ["dates", "coordinates", "city", "country", "venue_name", "image_url", "ticket_url", "size_band", "category", "tags", "subgenres"];
  for (const felt of fakta) {
    if (gjettet.has(felt)) continue;
    const harVerdi = felt === "dates" ? c.date_from : felt === "coordinates" ? Number.isFinite(c.latitude) : Array.isArray(c[felt]) ? c[felt].length : c[felt];
    const kilde = kildeFor(c, felt);
    if (!harVerdi || !kilde) continue;
    linjer.push(`- ${ETIKETT[felt]}: ${verdiTekst(felt, c)} -- ${kilde}`);
  }
  if (gjetninger.length) {
    linjer.push("", "GJETTET (står ikke på siden):");
    for (const g of gjetninger) linjer.push(`- ${ETIKETT[g.felt]} «${[].concat(g.verdi).join(", ")}»: ${g.basis}`);
  }
  return linjer.join("\n");
}

/**
 * Raden som legges i køen. Ren funksjon, og den nekter å bygge en rad av en
 * kandidat som ikke er klar: da finnes det ingen vei fra en ufullstendig
 * kandidat til køen, uansett hva som kaller den.
 */
export function byggRad(c, svar) {
  if (!svar?.klar) {
    throw new Error("Ikke sendt: kandidaten er ikke klar. Se mangler, feil og blokkert.");
  }
  return {
    kind: "festival_new",
    festival_id: null,
    payload: svar.payload,
    base_snapshot: {},
    source_url: c.source_url,
    confidence: svar.confidence,
    note: svar.note,
    status: "pending",
  };
}

/* ------------------------------------------------------------- databasen -- */

async function sb(path) {
  if (!SB_URL || !SB_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY må være satt. Kjør «sjekk».");
  const res = await fetch(`${SB_URL}${path}`, { headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` } });
  if (!res.ok) throw new Error(`Databasen svarte HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function alleFestivaler() {
  const ut = [];
  const side = 1000;
  for (let fra = 0; ; fra += side) {
    const rader = await sb(`/rest/v1/festivals?select=slug,name,city,country,latitude,longitude,website_url&order=slug&offset=${fra}&limit=${side}`);
    ut.push(...rader);
    if (rader.length < side) break;
  }
  return ut;
}

/**
 * Den eneste skrivingen i fila. Én rad i køen, aldri noe annet sted. Avviser
 * databasen forslaget (duplikat, tak, manglende belegg), står grunnen i feilen.
 */
async function tilKoen(rad) {
  if (!SB_URL || !SB_SERVICE) {
    throw new Error("send krever SUPABASE_SERVICE_ROLE_KEY i .env.local. Den skal aldri skrives ut eller sjekkes inn.");
  }
  const headers = { apikey: SB_SERVICE, authorization: `Bearer ${SB_SERVICE}`, "content-type": "application/json" };
  const robot = await fetch(`${SB_URL}/rest/v1/profiles?is_robot=is.true&select=id&limit=1`, { headers });
  if (!robot.ok) throw new Error(`Fant ikke robotprofilen (HTTP ${robot.status}).`);
  const [profil] = await robot.json();
  if (!profil) throw new Error("Fant ingen robotprofil. Kjør scripts/create_robot.py først.");

  if (rad.kind !== "festival_new") throw new Error("tilKoen sender bare forslag om ny festival.");
  const res = await fetch(`${SB_URL}/rest/v1/submissions`, {
    method: "POST",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify([{ ...rad, submitted_by: profil.id }]),
  });
  const tekst = await res.text();
  if (!res.ok) {
    let grunn = tekst;
    try { grunn = JSON.parse(tekst).message ?? tekst; } catch { /* rå tekst */ }
    throw new Error(`Databasen avviste forslaget: ${grunn}`);
  }
  return JSON.parse(tekst)[0];
}

/**
 * Kandidaten, enten rett fra kommandoen (`bygg '{"name": ...}'`) eller fra en
 * fil. Rett fra kommandoen er det som brukes om natta: da finnes det ingen fil
 * å skrive, og dermed ingen godkjenningsdialog, uansett hvor økten starter.
 */
export function lesKandidat(raw) {
  if (!raw) throw new Error("Mangler kandidaten. Bruk: bygg '{\"name\": ...}' (eller kjenner, send).");
  const tekst = raw.trim().startsWith("{") ? raw : readFileSync(raw, "utf8");
  try {
    return JSON.parse(tekst);
  } catch (err) {
    throw new Error(`Kandidaten er ikke gyldig JSON (${err.message}). En apostrof skrives \\u0027 inne i JSON-en.`);
  }
}

const koord = (c) => (Number.isFinite(c.latitude) && Number.isFinite(c.longitude) ? [c.latitude, c.longitude] : null);

/* -------------------------------------------------------------- kommandoer */

async function sjekk() {
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${SB_URL ? "satt" : "MANGLER"}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SB_KEY ? "satt" : "MANGLER"}`);
  console.log(`TUNETRAIL_KONTAKT (valgfri): ${KONTAKT ? "satt" : "ikke satt"}`);
  if (!SB_URL || !SB_KEY) throw new Error("Nøkler mangler. Stopp og si fra.");
}

async function les(args) {
  const [url] = positional(args);
  if (!url) throw new Error("Mangler adresse. Bruk: les https://festival.example/");
  const grense = Number(flag(args, "--tekst")) || 6000;
  console.log(JSON.stringify(await lesSide(url, { tekstGrense: grense }), null, 2));
}

async function geokode(args) {
  const [sok] = positional(args);
  if (!sok) throw new Error('Mangler søk. Bruk: geokode "Stadtpark Hamburg" --land=de');
  console.log(JSON.stringify(await geocode(sok, { land: flag(args, "--land") }), null, 2));
}

async function bilde(args) {
  const [url] = positional(args);
  if (!url) throw new Error("Mangler adresse. Bruk: bilde https://festival.example/bilde.jpg");
  console.log(JSON.stringify(await checkImage(url), null, 2));
}

async function kjenner(args) {
  const c = lesKandidat(positional(args)[0]);
  const treff = findDuplicates({ name: c.name, city: c.city, country: c.country, coords: koord(c), website: c.website_url }, await alleFestivaler());
  console.log(JSON.stringify(treff.length ? treff : "ingen treff", null, 2));
}

/** Samme vurdering for `bygg` og `send`, så de aldri kan være uenige. */
async function vurder(c, { utenNett = false } = {}) {
  const alle = await alleFestivaler();
  const ctx = {
    countries: [...new Set(alle.map((f) => f.country).filter(Boolean))].sort(),
    duplicates: findDuplicates({ name: c.name, city: c.city, country: c.country, coords: koord(c), website: c.website_url }, alle),
  };
  if (!utenNett) {
    if (c.image_url) ctx.imageInfo = await checkImage(c.image_url);
    if (koord(c)) {
      try { ctx.geoCountry = await reverseCountry(c.latitude, c.longitude); } catch { /* advarsel under */ }
    }
  }
  return checkCandidate(c, ctx);
}

async function bygg(args) {
  const c = lesKandidat(positional(args)[0]);
  const svar = await vurder(c, { utenNett: args.includes("--uten-nett") });
  console.log(JSON.stringify({ sendt: false, ...svar }, null, 2));
}

async function send(args) {
  const c = lesKandidat(positional(args)[0]);
  // Alltid med nett: et bilde og et land som ikke er sjekket, sendes ikke.
  const svar = await vurder(c);
  if (!svar.klar) {
    console.log(JSON.stringify({ sendt: false, ...svar }, null, 2));
  }
  const lagret = await tilKoen(byggRad(c, svar));
  console.log(JSON.stringify({
    sendt: true,
    submission_id: lagret.id,
    festival: c.name,
    confidence: svar.confidence,
    gjetninger: svar.gjetninger.map((g) => `${g.felt}: ${g.basis}`),
    advarsler: svar.advarsler,
  }, null, 2));
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kommando, ...rest] = process.argv.slice(2);
  const kommandoer = { sjekk, les, geokode, bilde, kjenner, bygg, send };
  if (!kommandoer[kommando]) {
    console.error(`Ukjent kommando «${kommando ?? ""}». Se kommentaren øverst i denne fila.`);
    process.exit(2);
  }
  try {
    await kommandoer[kommando](rest);
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exit(1);
  }
}
