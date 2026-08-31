#!/usr/bin/env node
/**
 * Nattjobbens hender. Hodet er Claude Code -- se
 * .claude/skills/nattlig-oppdatering/SKILL.md.
 *
 * Arbeidsdelingen er hele poenget. Alt som kan gjøres av kode gjøres her:
 * hente siden, gjøre den om til lesbar tekst, kjenne igjen navnene som
 * allerede står i basen, rense dem, sjekke datoene, skrive forslaget. Igjen
 * står det som faktisk trenger et hode -- er dette 2027-plakaten eller står
 * fjorårets fortsatt? -- og bare det sendes til modellen.
 *
 * Det er derfor dette går på et abonnement og ikke på en regning: 12 419
 * artistnavn ligger allerede i basen, og de aller fleste på et plakat har
 * spilt et sted før.
 *
 * Roboten skriver aldri til festivals eller festival_editions. Den skriver
 * forslag, som ligger i køen til de er godkjent.
 *
 *   node --env-file=.env.local scripts/robot-nightly.mjs pick [--count 8] [--year 2027]
 *   node --env-file=.env.local scripts/robot-nightly.mjs read <slug> [--url <adresse>]
 *   node --env-file=.env.local scripts/robot-nightly.mjs propose <forslag.json>
 *   node --env-file=.env.local scripts/robot-nightly.mjs note <slug> "hvorfor det ikke ble noe"
 *
 * Krever SUPABASE_SERVICE_ROLE_KEY og NEXT_PUBLIC_SUPABASE_URL i miljøet.
 */

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Samme adresse som endringsvakten oppgir. 669 nettsteder én gang i måneden er
// svært lite trafikk, men de skal kunne se hvem det er i loggene sine.
const USER_AGENT =
  "TunetrailWatch/1.0 (+https://tune-trail.org; kontakt: michellestefansen@gmail.com)";

const FETCH_TIMEOUT_MS = 15000;

/* ------------------------------------------------------------- database -- */

async function sb(path, { method = "GET", body, prefer } = {}) {
  // Sjekkes her og ikke ved oppstart, slik at tekstbehandlingen kan prøves i
  // en test uten at noen nøkkel er satt.
  if (!SB_URL || !SB_KEY) {
    throw new Error(
      "Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Tjenestenøkkelen har full tilgang -- hold den i miljøet, aldri i en fil som sjekkes inn.",
    );
  }
  const res = await fetch(`${SB_URL}${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      authorization: `Bearer ${SB_KEY}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const rpc = (fn, args) => sb(`/rest/v1/rpc/${fn}`, { method: "POST", body: args });

/* ----------------------------------------------------------------- tekst -- */

/**
 * HTML-entiteter til bokstaver.
 *
 * Ikke en detalj: «Bj&ouml;rk» som ikke dekodes matcher ingenting i
 * artistregisteret, og tyske, franske og nordiske festivalsider er fulle av
 * dem. Navnet ville da havnet i unknown_candidates og krevd en vurdering av
 * modellen -- for et navn som står i basen fra før.
 *
 * De navngitte Latin-1-entitetene ligger på kodepunkt 192-255 i nøyaktig den
 * rekkefølgen de er listet her, så tabellen skriver seg selv.
 */
const LATIN1 =
  "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml " +
  "Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times " +
  "Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc " +
  "atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc " +
  "iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute " +
  "ucirc uuml yacute thorn yuml";

const ENTITIES = new Map([
  ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"],
  ["nbsp", " "], ["copy", "\u00a9"], ["reg", "\u00ae"], ["deg", "\u00b0"],
  ["middot", "\u00b7"], ["ndash", "\u2013"], ["mdash", "\u2014"],
  ["lsquo", "\u2018"], ["rsquo", "\u2019"], ["ldquo", "\u201c"],
  ["rdquo", "\u201d"], ["hellip", "\u2026"], ["bull", "\u2022"],
  ...LATIN1.split(" ").map((name, i) => [name, String.fromCharCode(192 + i)]),
]);

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d?);/gi, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      // Ugyldige kodepunkter finnes på sider som er satt sammen for hånd.
      // Da er det bedre å la teksten stå som den er enn å kaste.
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES.get(body) ?? ENTITIES.get(body.toLowerCase()) ?? whole;
  });
}

/**
 * HTML til lesbar tekst, med tall og datoer intakt.
 *
 * Bevisst en annen funksjon enn normalise() i src/lib/watchFingerprint.ts, som
 * gjør det motsatte: den fjerner alle tall for at et fingeravtrykk skal være
 * stabilt fra natt til natt. Her er tallene selve svaret -- «17-20 juni 2027»
 * er det vi kom for.
 *
 * Linjeskillene beholdes. På et festivalplakat står ett artistnavn per linje
 * eller per listeelement, og den strukturen er det beste hintet som finnes om
 * hvor et navn slutter og det neste begynner.
 */
export function toText(html) {
  const stripped = html
    // select er aldri en lineup, men landlisten i et nyhetsbrevskjema er 250
    // navn som ser ut som kandidater. Roskildes forside ga «British Virgin
    // Islands» og «Federated States of Moldova» i bunken modellen skulle lese.
    .replace(/<(script|style|noscript|svg|head|select)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Blokkelementer blir linjeskift før taggene fjernes, ellers klistrer
    // «AuroraBjörkCMAT» seg sammen til ett uleselig ord.
    .replace(/<\/?(br|p|div|li|h[1-6]|td|tr|a|span|section|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  // Entitetene dekodes etter at taggene er borte. Motsatt rekkefølge ville
  // gjort «&lt;script&gt;» i en tekst om til en tagg som deretter ble strippet.
  return decodeEntities(stripped)
    .replace(/[^\S\n]+/g, " ")
    // Én tom linje er nok. Et listeelement gir linjeskift både på åpne- og
    // lukketaggen, og uten dette står det en blank linje mellom hvert navn.
    .replace(/\n\s*\n+/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

/** Samme nøkkel som artist_names.name_key: små bokstaver, uten aksenter. */
export function nameKey(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Klokkeslett foran navnet strippes, i motsetning til i skjemaet.
 *
 * checkArtistName i src/lib/submissions.ts avviser «20:30 Melody Gardot» og
 * ber bidragsyteren rette det selv. Det er riktig når det står et menneske
 * der. Klokka to om natta gjør det ikke, og et avvist navn er da et navn som
 * blir borte. 235 slike lå i basen og gjorde artistene usøkbare -- de kom
 * nettopp fra maskinell innlesing som denne.
 */
export function cleanName(raw) {
  let name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = name.replace(/^\d{1,2}[:.]\d{2}(\s*[-–—]\s*\d{1,2}[:.]\d{2})?\s*/, "");
  const hadTime = stripped !== name;
  name = stripped.trim();
  return { name, hadTime };
}

/**
 * Hvor mye av siden er programmet du allerede har lagret, år for år.
 *
 * Dette er det avgjørende signalet, og det kom fra Roskildes programside
 * 31. august 2026: den hadde «26/6 - 3/7 2027» øverst og fjorårets 174
 * artister under. Å telle årstall svarte feil på den siden. Dette svarer
 * riktig, og det svarer uten å gjette.
 *
 * Er 93 % av det du har lagret for 2026 å finne på siden, ser du på
 * 2026-plakaten. Det er ikke en tolkning, det er en opptelling.
 *
 * Motsatt vei er den stille: en side med et helt nytt program overlapper med
 * ingenting, og det er nettopp da det er noe å hente.
 */
export function matchEditions(pageKeys, editions) {
  const onPage = new Set(pageKeys);

  return editions
    .map((e) => {
      const stored = new Set();
      for (const day of e.program ?? []) {
        for (const a of day.artists ?? []) {
          const key = nameKey(cleanName(a.name ?? "").name);
          if (key) stored.add(key);
        }
      }
      let hits = 0;
      for (const key of stored) if (onPage.has(key)) hits++;
      return {
        year: e.year,
        in_edition: stored.size,
        on_page: hits,
        // Andel av det lagrede programmet som står på siden. Null lagret gir
        // null andel, ikke en divisjon på null som ser ut som et svar.
        share: stored.size ? Math.round((hits / stored.size) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.year - a.year);
}

/**
 * Lenker på siden som ser ut som de fører til programmet.
 *
 * Vaktlisten ble fylt fra festivals.website_url, altså forsiden. På en forside
 * står sjelden lineupen -- Roskildes forside har datoene øverst og ikke ett
 * artistnavn. Uten dette leser roboten feil side og finner ingenting, natt
 * etter natt.
 *
 * Bare lenker til samme nettsted: en «line-up»-lenke til Ticketmaster fører
 * til noen andres data, som er nøyaktig kilden vi gikk bort fra.
 */
export function lineupLinks(html, baseUrl) {
  const looksRight =
    /(line-?up|programm?|artist|acts|spille|tidsplan|schedule|plakat|kunstner)/i;
  const found = new Map();

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, inner] = m;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;

    const label = toText(inner).replace(/\s+/g, " ").trim();
    if (!looksRight.test(href) && !looksRight.test(label)) continue;

    let url;
    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.hostname !== new URL(baseUrl).hostname) continue;

    url.hash = "";
    if (!found.has(url.href)) found.set(url.href, label || url.pathname);
  }

  // Programsiden lenker til én side per artist -- Roskildes ga 200 stykker,
  // alle med «/program/» i adressen. De er ikke det vi leter etter: vi vil ha
  // oversikten, ikke de 200 undersidene av den.
  //
  // Grunne adresser først. «/program» og «/en/line-up» slår «/program/musik/
  // gorillaz» hver gang, og en topp på 20 holder listen lesbar for et hode som
  // skal velge én av dem.
  const depth = (u) => new URL(u).pathname.replace(/\/+$/, "").split("/").length;

  return [...found.entries()]
    .map(([url, label]) => ({ url, label }))
    .sort((a, b) => depth(a.url) - depth(b.url) || a.url.length - b.url.length)
    .slice(0, 20);
}

/**
 * Bitene av siden som kan være et artistnavn.
 *
 * Linjene først -- på et plakat står ett navn per linje, og den strukturen er
 * det beste hintet som finnes om hvor et navn slutter. Så linjene delt opp på
 * nytt der de er skilt med noe som pleier å skille navn, for sidene som
 * skriver hele lineupen på én lang linje.
 */
export function candidates(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    out.push(line);
    const parts = splitOnSeparators(line);
    if (parts.length > 1) out.push(...parts);
  }
  return out.filter(Boolean);
}

/** Tegnene som pleier å skille to artistnavn på samme linje. */
export function splitOnSeparators(line) {
  return line
    .split(/\s*[•|·/,]\s*|\s+[-–—]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ pick -- */

async function pick(args) {
  const count = Number(flag(args, "--count") ?? 8);
  const year = Number(flag(args, "--year") ?? 2027);
  const rows = await rpc("next_for_ai", { p_limit: count, p_year: year });
  console.log(JSON.stringify(rows, null, 2));
}

/* ------------------------------------------------------------------ read -- */

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hva som står på siden, sortert i det maskinen er sikker på og det den ikke er.
 *
 * known er navn som allerede finnes i basen -- de trenger ingen vurdering.
 * unknown er alt annet som ser ut som det kan være et navn, og det er den
 * eneste bunken modellen må lese.
 */
async function read(args) {
  const [slug] = positional(args);
  if (!slug) throw new Error("Mangler slug. Bruk: read <slug> [--url <adresse>]");

  const [festival] = await sb(
    `/rest/v1/festivals?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,website_url`,
  );
  if (!festival) throw new Error(`Fant ingen festival med slug «${slug}».`);

  const [watch] = await sb(`/rest/v1/festival_watch?festival_id=eq.${festival.id}&select=url`);
  const editions = await sb(
    `/rest/v1/festival_editions?festival_id=eq.${festival.id}&select=year,program&order=year.desc`,
  );
  const url = flag(args, "--url") ?? watch?.url ?? festival.website_url;
  if (!url) throw new Error(`«${slug}» har ingen adresse å lese.`);

  const html = await fetchPage(url);
  const text = toText(html);

  // Under dette er siden i praksis tom for oss -- et JavaScript-skall vi ikke
  // kan lese. Samme grense som endringsvakten bruker.
  if (text.length < 200) {
    throw new Error(
      `Siden ga bare ${text.length} tegn lesbar tekst -- trolig en JavaScript-side vi ikke når.`,
    );
  }

  const known = new Map();
  const unknown = new Map();

  const lookup = await artistLookup();

  for (const raw of candidates(text)) {
    const { name } = cleanName(raw);
    if (name.length < 2 || name.length > 120) continue;
    // En hel setning er ikke et artistnavn. Åtte ord er romslig -- «Nick Cave
    // and the Bad Seeds» er seks.
    if (name.split(" ").length > 8) continue;

    const key = nameKey(name);
    const hit = lookup.get(key);
    if (hit) known.set(hit, (known.get(hit) ?? 0) + 1);
    else if (/[\p{L}]/u.test(name)) unknown.set(name, (unknown.get(name) ?? 0) + 1);
  }

  // «Aurora, Björk» legges inn både som hel linje og som to biter. Bitene
  // kjennes igjen; den hele linjen gjør det ikke, og ville havnet i bunken
  // modellen må lese. Det er den bunken som koster, så den ryddes her.
  //
  // Delingen brukes til å avgjøre det, ikke en substrengsjekk: «Airbourne»
  // inneholder «Air», som er et ekte bandnavn, og en substrengsjekk ville
  // dermed kastet et ekte funn.
  for (const candidate of [...unknown.keys()]) {
    const parts = splitOnSeparators(candidate);
    if (parts.length > 1 && parts.some((p) => lookup.has(nameKey(cleanName(p).name)))) {
      unknown.delete(candidate);
    }
  }

  const years = {};
  for (const m of text.matchAll(/\b(20[2-3]\d)\b/g)) years[m[1]] = (years[m[1]] ?? 0) + 1;

  const result = {
        slug: festival.slug,
        name: festival.name,
        url,
        fetched_at: new Date().toISOString(),
        years_mentioned: years,
        // Viktigere enn years_mentioned: sier siden 2027 øverst mens 93 % av
        // fjorårets lagrede program står under, er dette fjorårets side.
        edition_match: matchEditions(
          [...known.keys(), ...unknown.keys()].map((n) => nameKey(n)),
          editions ?? [],
        ),
        // Fant vi ingen kjente navn, er dette nesten alltid feil side og ikke
        // en festival uten lineup. Da er lenkene under det viktigste i svaret.
        lineup_links: lineupLinks(html, url),
        known_artists: [...known.keys()].sort(),
        unknown_candidates: [...unknown.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 400)
          .map(([n]) => n),
        text: text.slice(0, 20000),
        text_truncated: text.length > 20000,
  };

  // Full utskrift er det modellen trenger, men den er uleselig for et menneske
  // i en terminal -- og en lang linje mister tegn ved kopiering. --kort gir
  // det som avgjør, og ingenting annet.
  if (args.includes("--kort")) {
    console.log(
      JSON.stringify(
        {
          festival: result.name,
          url: result.url,
          edition_match: result.edition_match,
          years_mentioned: result.years_mentioned,
          tekst_lengde: text.length,
          kjente_artister: result.known_artists,
          // Hele bunken, ikke bare antallet. Er den tom for artistnavn og full
          // av menypunkter, er siden uten lineup -- og det er den vurderingen
          // et menneske skal kunne gjøre på ett blikk.
          ukjente_kandidater: result.unknown_candidates.slice(0, 60),
          lineup_links: result.lineup_links.slice(0, 8),
          første_linjer: text.split("\n").slice(0, 20),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

/** Hele artistregisteret som en oppslagstabell. ~12 000 rader, hentes i bolker. */
async function artistLookup() {
  const map = new Map();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const rows = await sb(
      `/rest/v1/artist_names?select=name,name_key&order=name&offset=${from}&limit=${page}`,
    );
    for (const r of rows) map.set(r.name_key, r.name);
    if (rows.length < page) break;
  }
  return map;
}

/* --------------------------------------------------------------- propose -- */

/**
 * Skriv forslaget inn i køen.
 *
 * Kontrollene her er ikke pynt. Programforslag fra skjemaet går gjennom
 * submitAll i src/app/foresla/.../actions.ts, som sjekker navn og datoer før
 * noe lagres. Roboten går utenom den ruta, og apply_program_submission sjekker
 * ingen av delene -- så uten disse kontrollene ville en dato utenfor
 * festivalens periode blitt lagret og deretter vært usynlig i appen for alltid.
 * 16 slike dager lå i basen da dette ble oppdaget sist.
 */
/**
 * Forslaget som operasjoner, eller en feil som forklarer hvorfor ikke.
 *
 * Ren funksjon med vilje: dette er stedet en feil koster mest, og det eneste
 * stedet her som kan prøves uten en database. En dato utenfor festivalens
 * periode blir lagret uten innvending og er deretter usynlig i appen for
 * alltid -- 16 slike dager lå i basen da det ble oppdaget sist, blant dem tre
 * dager med 42 artister på Zürich Openair.
 *
 * `edition` er null når året ikke finnes ennå.
 */
export function buildOps(input, edition) {
  const { year } = input;
  const ops = { add: [], remove: [], move: [] };
  const warnings = [];

  if (!input.slug) throw new Error("Forslaget mangler slug.");
  if (!Number.isInteger(year)) throw new Error("Forslaget mangler year.");
  if (!input.source_url) throw new Error("Forslaget mangler source_url -- hvor leste du dette?");
  if (input.confidence !== "high" && input.confidence !== "low") {
    throw new Error("Forslaget mangler confidence: «high» eller «low».");
  }
  if (input.remove?.length || input.move?.length) {
    throw new Error("Roboten fjerner og flytter ikke. Se docs/plan-2027-oppdatering.md punkt 2.");
  }

  // Datoene først: de avgjør hvilket spenn tilføyelsene måles mot.
  if (input.dates) {
    const { from, to } = input.dates;
    if (!isDate(from) || !isDate(to)) throw new Error("dates.from og dates.to må være ÅÅÅÅ-MM-DD.");
    if (to < from) throw new Error("dates.to er før dates.from.");
    if (from.slice(0, 4) !== String(year)) {
      throw new Error(`dates hører til ${from.slice(0, 4)}, men forslaget gjelder ${year}.`);
    }
    const span = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
    if (span > 60) throw new Error(`${span} dager er ikke en festival, det er en skrivefeil.`);

    // Basen leses fra utgaven og ikke fra forslaget: den er hele poenget med
    // konfliktsjekken, så modellen skal ikke få bestemme hva den var.
    ops.dates = {
      from,
      to,
      base: edition ? { from: edition.date_from, to: edition.date_to } : null,
    };
  } else if (!edition) {
    throw new Error(
      `Festivalen har ingen ${year}-utgave, og forslaget har ingen datoer å opprette den med.`,
    );
  }

  const range = input.dates ?? { from: edition.date_from, to: edition.date_to };

  // Navnene som allerede står der: en tilføyelse av et navn som finnes er
  // harmløs, men den blåser opp diffen og gjør «+42» til et tall du ikke kan
  // stole på når du ser på det i køen.
  const existing = new Set();
  for (const day of edition?.program ?? []) {
    for (const a of day.artists ?? []) existing.add(`${day.date}|${nameKey(a.name ?? "")}`);
  }

  const seen = new Set();
  for (const item of input.add ?? []) {
    const { name, hadTime } = cleanName(item.name);
    if (hadTime) warnings.push(`klokkeslett strippet fra «${item.name}»`);
    if (!name) continue;
    if (name.length > 120) {
      throw new Error(`«${name.slice(0, 40)}…» er for langt til å være et navn.`);
    }
    if (!isDate(item.date)) throw new Error(`«${item.date}» er ikke en dato.`);
    if (item.date < range.from || item.date > range.to) {
      throw new Error(
        `${item.date} ligger utenfor ${range.from}–${range.to}. En slik dag vises aldri i appen.`,
      );
    }
    const key = `${item.date}|${nameKey(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (existing.has(key)) {
      warnings.push(`«${name}» sto der fra før`);
      continue;
    }
    // stage og time med vilje utelatt: tekst der gjør artisten usøkbar i appen.
    ops.add.push({ date: item.date, name });
  }

  if (!ops.add.length && !ops.dates) {
    throw new Error(
      "Ingenting å foreslå. Bruk «note» i stedet, så festivalen ikke kommer opp igjen i morgen.",
    );
  }

  return { ops, warnings };
}

async function propose(args) {
  const [file] = positional(args);
  if (!file) throw new Error("Mangler fil. Bruk: propose <forslag.json>");
  const input = JSON.parse(readFileSync(file, "utf8"));

  const [festival] = await sb(
    `/rest/v1/festivals?slug=eq.${encodeURIComponent(input.slug ?? "")}&select=id,name`,
  );
  if (!festival) throw new Error(`Fant ingen festival med slug «${input.slug}».`);

  const [edition] = await sb(
    `/rest/v1/festival_editions?festival_id=eq.${festival.id}&year=eq.${input.year}` +
      `&select=date_from,date_to,program`,
  );

  const { ops, warnings } = buildOps(input, edition ?? null);

  const [row] = await sb("/rest/v1/submissions", {
    method: "POST",
    prefer: "return=representation",
    body: [
      {
        kind: "program_edit",
        festival_id: festival.id,
        edition_year: input.year,
        payload: ops,
        // Operasjoner bærer sin egen førtilstand: å legge til et navn som
        // allerede er der er harmløst, ikke en konflikt.
        base_snapshot: {},
        source_url: input.source_url,
        confidence: input.confidence,
        note: input.note ?? null,
        submitted_by: await robotId(),
        status: "pending",
      },
    ],
  });

  await stamp(festival.id, input.ai_note ?? `forslag sendt: ${summarise(ops)}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        submission_id: row.id,
        festival: festival.name,
        summary: summarise(ops),
        warnings,
      },
      null,
      2,
    ),
  );
}

function summarise(ops) {
  const parts = [];
  if (ops.dates) parts.push(`datoer ${ops.dates.from}–${ops.dates.to}`);
  if (ops.add.length) parts.push(`+${ops.add.length}`);
  return parts.join(", ") || "ingenting";
}

export const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

/**
 * Lagre adressen der lineupen faktisk bor.
 *
 * Kjøres én gang per festival, første gang roboten finner undersiden. Deretter
 * peker både endringsvakten og roboten rett på riktig side, i stedet for på en
 * forside som aldri endrer seg på den måten vi bryr oss om.
 */
async function watchUrl(args) {
  const [slug, url] = positional(args);
  if (!slug || !url) throw new Error("Bruk: watch-url <slug> <adresse>");
  if (!/^https?:\/\//i.test(url)) throw new Error("Adressen må begynne med http:// eller https://");

  const [festival] = await sb(
    `/rest/v1/festivals?slug=eq.${encodeURIComponent(slug)}&select=id,name`,
  );
  if (!festival) throw new Error(`Fant ingen festival med slug «${slug}».`);

  const rows = await sb(`/rest/v1/festival_watch?festival_id=eq.${festival.id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      url,
      // Avtrykket gjaldt den gamle siden. Beholdt ville den nye siden sett
      // «endret» ut ved første sjekk, som er en falsk alarm og ikke et funn.
      fingerprint: null,
      failures: 0,
      last_error: null,
    },
  });
  if (!rows?.length) throw new Error("Fant ingen rad i festival_watch for festivalen.");

  console.log(JSON.stringify({ ok: true, festival: festival.name, url }, null, 2));
}

/* ------------------------------------------------------------------ note -- */

/**
 * «Jeg så på denne, og det ble ingenting.»
 *
 * Dette er stedet roboten har lov til å gi opp, og det er like viktig som å
 * sende et forslag. Uten det kommer de vanskeligste sidene opp igjen natt
 * etter natt, og du får aldri vite hvilke festivaler som må tas for hånd.
 */
async function note(args) {
  const [slug, ...rest] = positional(args);
  const text = rest.join(" ").trim();
  if (!slug || !text) throw new Error('Bruk: note <slug> "hvorfor det ikke ble noe"');

  const [festival] = await sb(`/rest/v1/festivals?slug=eq.${encodeURIComponent(slug)}&select=id,name`);
  if (!festival) throw new Error(`Fant ingen festival med slug «${slug}».`);

  await stamp(festival.id, text);
  console.log(JSON.stringify({ ok: true, festival: festival.name, ai_note: text }, null, 2));
}

async function stamp(festivalId, text) {
  const rows = await sb(`/rest/v1/festival_watch?festival_id=eq.${festivalId}`, {
    method: "PATCH",
    // Uten dette svarer PostgREST 204 også når ingen rad ble truffet, og en
    // festival uten vaktrad ville blitt stående umerket -- og kommet opp igjen
    // i morgen, og i overmorgen.
    prefer: "return=representation",
    body: {
      ai_checked_at: new Date().toISOString(),
      ai_note: text,
      // Vakten har gjort sitt for denne siden: flagget er lest.
      pending: false,
    },
  });
  if (!rows?.length) {
    throw new Error(
      `Fant ingen rad i festival_watch for festivalen. Uten den blir ikke ` +
        `gjennomgangen registrert, og den kommer opp igjen i morgen.`,
    );
  }
}

let robotIdCache = null;
async function robotId() {
  if (robotIdCache) return robotIdCache;
  const rows = await sb("/rest/v1/profiles?is_robot=is.true&select=id&limit=1");
  if (!rows.length) {
    throw new Error("Fant ingen robotprofil. Kjør scripts/create_robot.py først.");
  }
  return (robotIdCache = rows[0].id);
}

/* ------------------------------------------------------------------- cli -- */

function flag(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

/** Argumentene som ikke er flagg, og ikke verdien til et flagg. */
function positional(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) i++;
    else out.push(args[i]);
  }
  return out;
}

// Bare når fila startes direkte. Testen importerer den for å prøve
// tekstbehandlingen, og skal ikke utløse en kjøring av det.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const commands = { pick, read, propose, note, "watch-url": watchUrl };

  if (!commands[command]) {
    console.error(`Ukjent kommando «${command ?? ""}». Se kommentaren øverst i denne fila.`);
    process.exit(2);
  }

  try {
    await commands[command](rest);
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exit(1);
  }
}
