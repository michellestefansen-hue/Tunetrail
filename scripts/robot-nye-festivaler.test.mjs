/**
 * Tester for jobben som leter etter nye festivaler.
 *
 *   node --test scripts/robot-nye-festivaler.test.mjs
 *
 * Alt som krever nett er prøvd med falske svar. Det betyr at logikken er
 * prøvd, men ikke at geokoderen eller en ekte festivalside oppfører seg slik
 * fiksturene her gjør. Det må prøves mot ekte sider.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIZE_BANDS, TAGS, CATEGORIES, SUBGENRES, LAND_ISO,
  hostOf, dupKey, findDuplicates, imageDimensions, checkImage, geocode,
  extractStructured, checkCandidate, composeNote,
} from "./robot-nye-festivaler.mjs";

const lesFil = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const strenger = (tekst) => [...tekst.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);

/* ----------------------------------------------- ordlistene driver ikke --- */

test("ordlistene er de samme som i appen", () => {
  const ts = lesFil("../src/lib/festivals.ts");
  const liste = (navn) => strenger(ts.match(new RegExp(`${navn}[^=]*=\\s*\\[([\\s\\S]*?)\\]`))[1]);

  assert.deepEqual(SIZE_BANDS, liste("export const SIZE_BANDS"), "størrelsene");
  assert.deepEqual(TAGS, liste("export const FESTIVAL_TAGS"), "taggene");

  const sub = (n) => strenger(ts.match(new RegExp(`${n}:\\s*\\[([\\s\\S]*?)\\]`))[1]);
  assert.deepEqual(SUBGENRES, [...sub("elektronisk"), ...sub("tungt")], "undersjangrene");

  const sql = lesFil("../supabase/migrations/20260703020000_add_festival_category.sql");
  const kat = strenger(sql.match(/category in \(([\s\S]*?)\)\)/)[1]);
  assert.deepEqual(CATEGORIES, kat, "hovedsjangrene");
});

test("skriptet har ingen måte å skrive på", () => {
  // Hele poenget med en tørrkjøring: det finnes ingen funksjon som kan sende
  // noe, så en feil kan ikke ende i køen din.
  const kilde = lesFil("./robot-nye-festivaler.mjs");
  assert.ok(!/method:\s*["'](POST|PATCH|PUT|DELETE)/i.test(kilde), "ingen skrivende HTTP-kall");
  assert.ok(!/SERVICE_ROLE/.test(kilde), "ingen service-nøkkel");
  assert.ok(!/rpc\//.test(kilde), "ingen databasefunksjoner");
});

test("alle landene i lista har en landkode", () => {
  for (const [land, kode] of Object.entries(LAND_ISO)) assert.match(kode, /^[a-z]{2}$/, land);
});

/* ------------------------------------------------------------ duplikater -- */

const FINNES = [
  { slug: "pstereo-festival", name: "Pstereo Festival", city: "Saint-Jérôme", country: "Frankrike", latitude: 48.0, longitude: 2.0, website_url: "https://www.pstereo.example/" },
  { slug: "cheltenham-jazz", name: "Cheltenham Jazz Festival", city: "Cheltenham", country: "Storbritannia", latitude: 51.9, longitude: -2.07, website_url: "https://cheltenhamfestivals.example/jazz" },
  { slug: "annet", name: "Helt Annet", city: "Oslo", country: "Norge", latitude: 59.91, longitude: 10.75, website_url: "https://annet.example" },
];

test("samme nettsted er et duplikat, uansett hva festivalen heter", () => {
  const treff = findDuplicates(
    { name: "Helt Nytt Navn", city: "Lyon", country: "Frankrike", coords: [45.7, 4.8], website: "https://pstereo.example/om" },
    FINNES,
  );
  assert.equal(treff[0].slug, "pstereo-festival");
  assert.equal(treff[0].reason, "website");
  assert.equal(treff[0].exact, true);
});

test("«Pstereo» glir ikke forbi «Pstereo Festival»", () => {
  // Fire av fem duplikater i basen 2. august 2026 kom fra at navnene måtte være identiske.
  const treff = findDuplicates({ name: "Pstereo", city: "Paris", country: "Frankrike", coords: null }, FINNES);
  assert.equal(treff[0].slug, "pstereo-festival");
});

test("samme by er ikke samme festival", () => {
  // «Cheltenham Music Festival» skal ikke bli ett med jazzfestivalen.
  const treff = findDuplicates(
    { name: "Cheltenham Music Festival", city: "Cheltenham", country: "Storbritannia", coords: [51.95, -2.1] },
    FINNES.filter((f) => f.slug === "cheltenham-jazz"),
  );
  // Den er i nærheten, så den dukker opp som en mulighet, men ikke som sikker.
  assert.ok(treff.every((t) => !t.exact), "ingen sikre treff");
});

test("en helt annen festival gir ingen treff", () => {
  assert.deepEqual(findDuplicates({ name: "Nyfest", city: "Hamburg", country: "Tyskland", coords: [53.6, 10.0], website: "https://nyfest.example" }, FINNES), []);
});

test("nøkkelen ignorerer aksenter, rekkefølge og fyllord", () => {
  assert.equal(dupKey("Øya Festivalen"), dupKey("oya"));
  assert.equal(dupKey("Sónar"), dupKey("sonar"));
  assert.equal(hostOf("https://WWW.Example.org/x"), "example.org");
  assert.equal(hostOf("ikke en adresse"), null);
});

/* ----------------------------------------------------------------- bilder -- */

const png = (w, h) => {
  const b = Buffer.alloc(40);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};
const jpeg = (w, h) => {
  const b = Buffer.alloc(60);
  b[0] = 0xff; b[1] = 0xd8;                       // SOI
  b[2] = 0xff; b[3] = 0xe0; b.writeUInt16BE(16, 4); // APP0, lengde 16
  b[20] = 0xff; b[21] = 0xc0; b.writeUInt16BE(17, 22); b[24] = 8; // SOF0
  b.writeUInt16BE(h, 25); b.writeUInt16BE(w, 27);
  return b;
};
const gif = (w, h) => {
  const b = Buffer.alloc(16);
  b.write("GIF89a", 0, "latin1"); b.writeUInt16LE(w, 6); b.writeUInt16LE(h, 8);
  return b;
};
const webpX = (w, h) => {
  const b = Buffer.alloc(40);
  b.write("RIFF", 0, "latin1"); b.write("WEBP", 8, "latin1"); b.write("VP8X", 12, "latin1");
  b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3);
  return b;
};

test("størrelsen leses ut av de første bytene", () => {
  assert.deepEqual(imageDimensions(png(1200, 630)), { format: "png", width: 1200, height: 630 });
  assert.deepEqual(imageDimensions(jpeg(1920, 1080)), { format: "jpeg", width: 1920, height: 1080 });
  assert.deepEqual(imageDimensions(gif(400, 300)), { format: "gif", width: 400, height: 300 });
  assert.deepEqual(imageDimensions(webpX(1600, 900)), { format: "webp", width: 1600, height: 900 });
  assert.equal(imageDimensions(Buffer.from("<html>ikke et bilde</html>")), null);
});

const svar = ({ status = 200, type = "image/jpeg", body = Buffer.alloc(0), json } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  url: "https://x.example/",
  headers: { get: (k) => (k.toLowerCase() === "content-type" ? type : null) },
  body: {
    getReader() {
      let sendt = false;
      return {
        async read() { if (sendt) return { done: true }; sendt = true; return { done: false, value: new Uint8Array(body) }; },
        async cancel() {},
      };
    },
  },
  async json() { return json; },
  async text() { return body.toString(); },
});

test("et stort, ekte bilde godtas", async () => {
  const r = await checkImage("https://nyfest.example/bilde.jpg", { fetchImpl: async () => svar({ body: jpeg(1200, 630) }) });
  assert.equal(r.ok, true);
  assert.equal(r.width, 1200);
  assert.deepEqual(r.problems, []);
});

test("et lite bilde, en nettside og en dødlenke stoppes", async () => {
  const smaa = await checkImage("https://nyfest.example/a.jpg", { fetchImpl: async () => svar({ body: jpeg(300, 200) }) });
  assert.equal(smaa.ok, false);
  assert.match(smaa.problems.join(), /300 px bredt/);

  const side = await checkImage("https://nyfest.example/a.jpg", { fetchImpl: async () => svar({ type: "text/html", body: Buffer.from("<html>") }) });
  assert.equal(side.ok, false);
  assert.match(side.problems.join(), /ikke et bilde/);

  const dod = await checkImage("https://nyfest.example/a.jpg", { fetchImpl: async () => svar({ status: 404, type: "text/html" }) });
  assert.equal(dod.ok, false);
  assert.match(dod.problems.join(), /404/);

  const http = await checkImage("http://nyfest.example/a.jpg", { fetchImpl: async () => svar({ body: jpeg(1200, 630) }) });
  assert.equal(http.ok, false);
  assert.match(http.problems.join(), /https/);
});

test("logoer og utløpende adresser får en advarsel, ikke et nei", async () => {
  const logo = await checkImage("https://nyfest.example/img/logo-2027.png", { fetchImpl: async () => svar({ type: "image/png", body: png(1200, 630) }) });
  assert.equal(logo.ok, true);
  assert.match(logo.warnings.join(), /logo/);

  const signert = await checkImage("https://cdn.example/a.jpg?X-Amz-Signature=abc", { fetchImpl: async () => svar({ body: jpeg(1200, 630) }) });
  assert.match(signert.warnings.join(), /utløpe/);
});

test("SVG er ikke et festivalbilde", async () => {
  const r = await checkImage("https://nyfest.example/a.svg", { fetchImpl: async () => svar({ type: "image/svg+xml", body: Buffer.from("<svg/>") }) });
  assert.equal(r.ok, false);
});

/* ---------------------------------------------------------------- geokoder -- */

test("geokoderen svarer med punkt, land og om det er arenaen eller bare byen", async () => {
  let spurt;
  const r = await geocode("Stadtpark Hamburg", {
    land: "DE",
    pace: async () => {},
    fetchImpl: async (url) => {
      spurt = url;
      return svar({
        json: [
          { lat: "53.5965", lon: "10.0087", display_name: "Stadtpark, Hamburg", category: "leisure", type: "park", address: { country_code: "de" } },
          { lat: "53.55", lon: "9.99", display_name: "Hamburg", category: "boundary", type: "administrative", address: { country_code: "de" } },
        ],
      });
    },
  });
  assert.match(spurt, /countrycodes=de/);
  assert.deepEqual(r[0], { lat: 53.5965, lon: 10.0087, navn: "Stadtpark, Hamburg", landkode: "de", klasse: "leisure", type: "park", presisjon: "sted" });
  assert.equal(r[1].presisjon, "by");
});

test("en geokoder som svikter gir en feil, ikke et tomt punkt", async () => {
  await assert.rejects(geocode("x", { pace: async () => {}, fetchImpl: async () => svar({ status: 429 }) }), /429/);
});

/* ------------------------------------------------------------ festivalside -- */

const SIDE = `<!doctype html><html lang="de"><head>
  <title>Nyfest 2027</title>
  <meta property="og:image" content="/media/nyfest.jpg">
  <meta name="description" content="Ein neues Festival im Stadtpark.">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@graph":[
    {"@type":"MusicEvent","name":"Nyfest 2027","startDate":"2027-07-09","endDate":"2027-07-11",
     "image":["https://nyfest.example/media/ld.jpg"],
     "location":{"@type":"Place","name":"Stadtpark","address":{"@type":"PostalAddress","streetAddress":"Saarlandstr. 1","addressLocality":"Hamburg","addressCountry":"DE"},
                 "geo":{"@type":"GeoCoordinates","latitude":53.5965,"longitude":10.0087}}}
  ]}
  </script></head><body>
  <nav><a href="/lineup">Line-up</a> <a href="https://tickets.example/x">Tickets</a></nav>
  <p>Nyfest</p></body></html>`;

test("strukturerte data på siden gir sted, datoer og bilde uten å lese prosa", () => {
  const r = extractStructured(SIDE, "https://nyfest.example/");
  assert.equal(r.sprak, "de");
  assert.equal(r.og_bilde, "https://nyfest.example/media/nyfest.jpg", "relativ adresse gjøres absolutt");
  const e = r.strukturerte_data.find((n) => /Event/.test(n.type));
  assert.equal(e.start, "2027-07-09");
  assert.equal(e.slutt, "2027-07-11");
  assert.equal(e.bilde, "https://nyfest.example/media/ld.jpg");
  const sted = r.strukturerte_data.find((n) => n.lat != null);
  assert.equal(sted.lat, 53.5965);
  assert.equal(sted.lon, 10.0087);
  assert.deepEqual(r.lenker.map((l) => l.href), ["https://nyfest.example/lineup"], "bare lenker på festivalens eget nettsted");
});

test("ødelagte strukturerte data velter ikke lesingen", () => {
  const r = extractStructured(`<script type="application/ld+json">{ikke json</script><title>X</title>`, "https://x.example/");
  assert.deepEqual(r.strukturerte_data, []);
  assert.equal(r.tittel, "X");
});

/* --------------------------------------------------------- kandidatsjekk --- */

const KANDIDAT = {
  name: "Nyfest",
  source_url: "https://nyfest.example/",
  website_url: "https://nyfest.example/",
  country: "Tyskland",
  city: "Hamburg",
  venue_name: "Stadtpark",
  latitude: 53.5965,
  longitude: 10.0087,
  date_from: "2027-07-09",
  date_to: "2027-07-11",
  image_url: "https://nyfest.example/media/nyfest.jpg",
  ticket_url: "https://nyfest.example/tickets",
  tags: ["Elektronisk & Dans", "Techno & House"],
  category: "Elektronisk & Dans",
  subgenres: ["techno", "house"],
  size_band: "2000_10000",
  sources: {
    coordinates: "JSON-LD (geo) på forsiden",
    dates: "JSON-LD (startDate/endDate) på forsiden",
    image_url: "og:image på forsiden",
    location: "JSON-LD (location) på forsiden",
    venue_name: "JSON-LD (location.name)",
    ticket_url: "Lenken «Tickets» i menyen",
  },
  guesses: {
    size_band: { basis: "Camping og tre scener, ifølge /om-oss. Ligner Dekmantel, som er rundt 15 000, men nyere og mindre." },
    category: { basis: "Alle ni bekreftede artister er techno og house, se line-up-siden." },
    tags: { basis: "Samme grunnlag som hovedsjangeren: line-upen er ren techno og house." },
    subgenres: { basis: "Seks av ni artister er techno, tre er house, ifølge line-up-siden." },
  },
};

const CTX = { today: "2026-11-17", countries: ["Norge", "Tyskland", "Frankrike"], geoCountry: "de", imageInfo: { ok: true, problems: [], warnings: [] }, duplicates: [] };

test("en komplett, belagt kandidat er klar", () => {
  const r = checkCandidate(KANDIDAT, CTX);
  assert.deepEqual(r.mangler, []);
  assert.deepEqual(r.feil, []);
  assert.equal(r.klar, true);
  assert.equal(r.confidence, "high", "gjetninger senker ikke sikkerheten på selve festivalen");
});

test("notatet skiller hva som er lest fra hva som er gjettet, og sier hva gjetningen bygger på", () => {
  const r = checkCandidate(KANDIDAT, CTX);
  const [lest, gjettet] = r.note.split("GJETTET (står ikke på siden):");
  assert.match(lest, /HENTET FRA SIDEN/);
  assert.match(lest, /sted \(koordinater\): 53\.5965, 10\.0087 -- JSON-LD \(geo\)/);
  assert.match(lest, /bilde: https:\/\/nyfest\.example\/media\/nyfest\.jpg -- og:image/);
  // Det gjettede står bare under GJETTET, ikke som et faktum over.
  assert.ok(!/publikumsstørrelse/.test(lest), "størrelsen er gjettet og skal ikke stå som lest");
  assert.match(gjettet, /publikumsstørrelse «2000_10000»: Camping og tre scener/);
  assert.match(gjettet, /hovedsjanger «Elektronisk & Dans»: Alle ni bekreftede artister/);
  assert.match(gjettet, /tagger «Elektronisk & Dans, Techno & House»/);
});

test("gjetningene følger med i selve forslaget, ikke bare i notatet", () => {
  const r = checkCandidate(KANDIDAT, CTX);
  assert.match(r.payload.guesses.size_band, /Camping og tre scener/);
  assert.equal(r.payload.category, "Elektronisk & Dans");
  assert.deepEqual(r.payload.subgenres, ["techno", "house"]);
  assert.deepEqual(r.payload.program, []);
});

test("en gjetning uten ordentlig begrunnelse godtas ikke", () => {
  const r = checkCandidate({ ...KANDIDAT, guesses: { ...KANDIDAT.guesses, size_band: { basis: "tror det" } } }, CTX);
  assert.equal(r.klar, false);
  assert.match(r.feil.join(), /for tynn begrunnelse/);
});

test("størrelse uten verken kilde eller gjetning er ikke lov", () => {
  const { size_band: _, ...utenGjetning } = KANDIDAT.guesses;
  const r = checkCandidate({ ...KANDIDAT, guesses: utenGjetning }, CTX);
  assert.match(r.feil.join(), /publikumsstørrelse er hverken belagt eller merket som gjetning/);
});

test("en størrelse kan også være belagt, da er den ikke en gjetning", () => {
  const { size_band: _, ...utenGjetning } = KANDIDAT.guesses;
  const r = checkCandidate({ ...KANDIDAT, guesses: utenGjetning, sources: { ...KANDIDAT.sources, size_band: "Siden sier «ca. 6000 gjester per dag»" } }, CTX);
  assert.deepEqual(r.feil, []);
  assert.ok(!r.gjetninger.some((g) => g.felt === "size_band"));
  assert.match(r.note.split("GJETTET")[0], /publikumsstørrelse: 2000_10000 -- Siden sier/);
});

test("det som mangler kan fullføres en annen natt, det er ikke en feil", () => {
  const { image_url: _i, city: _c, ...rest } = KANDIDAT;
  const r = checkCandidate(rest, CTX);
  assert.deepEqual(r.mangler.sort(), ["city", "image_url"]);
  assert.equal(r.komplett, false);
  assert.equal(r.klar, false);
});

test("koordinater, datoer og bilde må ha en kilde", () => {
  const r = checkCandidate({ ...KANDIDAT, sources: {} }, CTX);
  const feil = r.feil.join("\n");
  assert.match(feil, /sted \(koordinater\) mangler kilde/);
  assert.match(feil, /datoer mangler kilde/);
  assert.match(feil, /bilde mangler kilde/);
});

test("koordinater med bredde og lengde byttet om stoppes", () => {
  const r = checkCandidate({ ...KANDIDAT, latitude: 10.0087, longitude: 53.5965 }, CTX);
  // 10.0087 N, 53.5965 E ligger utenfor Europa.
  assert.match(r.feil.join(), /utenfor Europa/);
});

test("koordinater i feil land stoppes", () => {
  const r = checkCandidate(KANDIDAT, { ...CTX, geoCountry: "fr" });
  assert.match(r.feil.join(), /Koordinatene ligger i «fr», men forslaget sier Tyskland/);
});

test("et land basen ikke har, stoppes med lista over de som finnes", () => {
  const r = checkCandidate({ ...KANDIDAT, country: "Germany" }, CTX);
  assert.match(r.feil.join(), /Landet «Germany» finnes ikke i basen/);
  assert.match(r.feil.join(), /Tyskland/);
});

test("en Facebook-side er ikke festivalens nettsted", () => {
  const r = checkCandidate({ ...KANDIDAT, website_url: "https://www.facebook.com/nyfest" }, CTX);
  assert.match(r.feil.join(), /ikke festivalens eget nettsted/);
});

test("datoer i fortiden og urimelig lange festivaler stoppes", () => {
  assert.match(checkCandidate({ ...KANDIDAT, date_from: "2026-07-09", date_to: "2026-07-11" }, CTX).feil.join(), /i fortiden/);
  assert.match(checkCandidate({ ...KANDIDAT, date_to: "2027-12-31" }, CTX).feil.join(), /ikke en festival/);
  assert.match(checkCandidate({ ...KANDIDAT, date_to: "2027-07-01" }, CTX).feil.join(), /før date_from/);
});

test("verdier utenfor ordlistene stoppes", () => {
  const r = checkCandidate({ ...KANDIDAT, size_band: "stor", category: "Techno", tags: ["Techno"], subgenres: ["house", "schlager"] }, CTX);
  const feil = r.feil.join("\n");
  assert.match(feil, /publikumsstørrelse: «stor» finnes ikke i lista/);
  assert.match(feil, /hovedsjanger: «Techno» finnes ikke i lista/);
  assert.match(feil, /tagger: «Techno» finnes ikke i lista/);
  assert.match(feil, /undersjangre: «schlager» finnes ikke i lista/);
});

test("et bilde som ikke virker stopper forslaget, en logo bare advarer", () => {
  const dod = checkCandidate(KANDIDAT, { ...CTX, imageInfo: { ok: false, problems: ["Bildet svarte HTTP 404."], warnings: [] } });
  assert.match(dod.feil.join(), /Bilde: Bildet svarte HTTP 404/);
  const logo = checkCandidate(KANDIDAT, { ...CTX, imageInfo: { ok: true, problems: [], warnings: ["Filnavnet ser ut som en logo"] } });
  assert.equal(logo.klar, true);
  assert.match(logo.advarsler.join(), /logo/);
});

test("en festival vi har fra før blokkeres, en mulig blir bare vist", () => {
  const sikker = checkCandidate(KANDIDAT, { ...CTX, duplicates: [{ slug: "nyfest", reason: "website", exact: true }] });
  assert.equal(sikker.blokkert, true);
  assert.equal(sikker.klar, false);

  const mulig = checkCandidate(KANDIDAT, { ...CTX, duplicates: [{ slug: "naer", reason: "nearby", exact: false }] });
  assert.equal(mulig.blokkert, false);
  assert.equal(mulig.klar, true);
  assert.equal(mulig.duplikater.length, 1, "et menneske ser den uansett");
});

test("midt-i-byen-punkt og foreløpige datoer gir lav sikkerhet", () => {
  assert.equal(checkCandidate({ ...KANDIDAT, location_precision: "by" }, CTX).confidence, "low");
  assert.equal(checkCandidate({ ...KANDIDAT, dates_status: "forelopig" }, CTX).confidence, "low");
});

test("det som ikke er sjekket, sies det fra om", () => {
  const r = checkCandidate(KANDIDAT, { today: "2026-11-17", countries: ["Tyskland"] });
  assert.match(r.advarsler.join("\n"), /Landet ble ikke kontrollert mot koordinatene/);
  assert.match(r.advarsler.join("\n"), /Bildet ble ikke sjekket/);
});

test("notatet kan brukes alene", () => {
  const n = composeNote({ ...KANDIDAT, note: "Nytt i 2027, første utgave." }, [{ felt: "size_band", verdi: "2000_10000", basis: "Tre scener og camping." }]);
  assert.match(n, /^Nytt i 2027, første utgave\./);
  assert.match(n, /GJETTET/);
});
