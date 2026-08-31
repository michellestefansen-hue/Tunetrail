/**
 * Tekstbehandlingen i nattjobben.
 *
 * Dette er den ene delen av roboten som stille kan slutte å virke. Alt annet
 * feiler høylytt -- en manglende nøkkel gir en feilmelding, en avvist
 * innsending gir en unntaksmelding fra databasen. Men en toText() som mister
 * linjeskillene gir bare færre artister enn i går, og ingen merker det.
 *
 *   node --test scripts/robot-nightly.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { toText, cleanName, nameKey, candidates, isDate, decodeEntities, buildOps, splitOnSeparators, lineupLinks, matchEditions, yearLines } from "./robot-nightly.mjs";

test("manus og stil forsvinner, teksten blir igjen", () => {
  const html = `
    <html><head><title>Fest</title></head><body>
      <script>var lineup = ["Hemmelig"];</script>
      <style>.a { color: red }</style>
      <h1>Lineup 2027</h1>
      <ul><li>Aurora</li><li>Bj&ouml;rk</li></ul>
    </body></html>`;
  const text = toText(html);
  assert.ok(!text.includes("Hemmelig"), "innholdet i <script> skal bort");
  assert.ok(!text.includes("color"), "innholdet i <style> skal bort");
  assert.ok(text.includes("Lineup 2027"));
  assert.ok(text.includes("Björk"), "HTML-entiteter skal bli til bokstaver");
});

test("blokkelementer blir linjeskift, ikke sammenklistrede navn", () => {
  // Den viktigste enkeltdetaljen i hele fila. Uten dette blir tre artister
  // til ett ord som ikke matcher noe som helst i artistregisteret.
  const text = toText("<li>Aurora</li><li>Björk</li><li>CMAT</li>");
  assert.equal(text, "Aurora\nBjörk\nCMAT");
});

test("årstall og datoer overlever", () => {
  // Motsatt av normalise() i watchFingerprint.ts, som fjerner alle tall for at
  // et fingeravtrykk skal være stabilt. Her er tallene selve svaret.
  const text = toText("<p>17-20 juni 2027</p><p>Dørene åpner 14:30</p>");
  assert.ok(text.includes("2027"));
  assert.ok(text.includes("17-20"));
  assert.ok(text.includes("14:30"));
});

test("klokkeslett strippes fra navnet", () => {
  // 235 navn med klokkeslett lå i basen og gjorde artistene usøkbare.
  assert.deepEqual(cleanName("20:30 Melody Gardot"), { name: "Melody Gardot", hadTime: true });
  assert.deepEqual(cleanName("20.30 Melody Gardot"), { name: "Melody Gardot", hadTime: true });
  assert.deepEqual(cleanName("21:00 - 22:15 Nils Frahm"), { name: "Nils Frahm", hadTime: true });
  assert.deepEqual(cleanName("  Fever   Ray "), { name: "Fever Ray", hadTime: false });
});

test("et tall i navnet er ikke et klokkeslett", () => {
  assert.deepEqual(cleanName("Sunn O)))"), { name: "Sunn O)))", hadTime: false });
  assert.deepEqual(cleanName("blink-182"), { name: "blink-182", hadTime: false });
  assert.deepEqual(cleanName("2 Chainz"), { name: "2 Chainz", hadTime: false });
});

test("nøkkelen matcher artist_names.name_key", () => {
  // lower(unaccent(navn)) i basen. «Bjork» skal finne «Björk».
  assert.equal(nameKey("Björk"), "bjork");
  assert.equal(nameKey("THE SONICS"), "the sonics");
  assert.equal(nameKey("  Sigur   Rós "), "sigur ros");
});

test("kandidatene er linjene, og bitene av dem", () => {
  const found = candidates("Aurora\nBjörk, CMAT • Dua Lipa\n");
  assert.ok(found.includes("Aurora"));
  assert.ok(found.includes("Björk"), "komma skiller navn");
  assert.ok(found.includes("CMAT"));
  assert.ok(found.includes("Dua Lipa"), "bullet skiller navn");
});

test("en linje som ikke er en liste beholdes hel", () => {
  // «Nick Cave and the Bad Seeds» skal ikke bli til «Nick Cave» og «the Bad
  // Seeds» bare fordi noen skrev den på samme linje som noe annet.
  const found = candidates("Nick Cave and the Bad Seeds");
  assert.deepEqual(found, ["Nick Cave and the Bad Seeds"]);
});

test("datoer godtas bare på ÅÅÅÅ-MM-DD", () => {
  assert.ok(isDate("2027-06-10"));
  assert.ok(!isDate("10.06.2027"));
  assert.ok(!isDate("2027-13-01"), "måned 13 finnes ikke");
  assert.ok(!isDate(""));
  assert.ok(!isDate(null));
});

test("en ekte plakatside gir gjenkjennelige navn", () => {
  // Formen de fleste festivalsider har: en meny, en overskrift med årstall,
  // og lineupen som listeelementer.
  const html = `
    <nav><a href="/">Hjem</a><a href="/tickets">Billetter</a></nav>
    <h2>Line-up 2027</h2>
    <div class="lineup">
      <div class="act">21:00 Fever Ray</div>
      <div class="act">Aurora</div>
      <div class="act">Nick Cave and the Bad Seeds</div>
    </div>
    <footer>&copy; 2026 Festivalen AS</footer>`;
  const names = candidates(toText(html)).map((c) => cleanName(c).name);
  assert.ok(names.includes("Fever Ray"), "klokkeslettet skal ikke skjule navnet");
  assert.ok(names.includes("Aurora"));
  assert.ok(names.includes("Nick Cave and the Bad Seeds"));
});

test("entiteter dekodes, også de navngitte", () => {
  // Feilen som ble funnet av testen over: uten dette matcher «Bj&ouml;rk»
  // ingenting i artistregisteret, og et navn som står i basen fra før havner
  // i bunken modellen må vurdere.
  assert.equal(decodeEntities("Bj&ouml;rk"), "Björk");
  assert.equal(decodeEntities("Sigur R&oacute;s"), "Sigur Rós");
  assert.equal(decodeEntities("Kv&aelig;fjord"), "Kvæfjord");
  assert.equal(decodeEntities("Motley Cr&#252;e"), "Motley Crüe");
  assert.equal(decodeEntities("Motley Cr&#xFC;e"), "Motley Crüe");
  assert.equal(decodeEntities("Sigur R&oacute;s &amp; venner"), "Sigur Rós & venner");
});

test("noe som ligner en entitet, men ikke er det, står i fred", () => {
  assert.equal(decodeEntities("AT&T"), "AT&T");
  assert.equal(decodeEntities("&ukjentnavn;"), "&ukjentnavn;");
  assert.equal(decodeEntities("&#99999999999;"), "&#99999999999;");
});

test("navn med aksenter finner nøkkelen sin gjennom entiteten", () => {
  // Hele kjeden, som den går på en ekte side: HTML inn, oppslagsnøkkel ut.
  const names = candidates(toText("<li>Bj&ouml;rk</li><li>Sigur R&oacute;s</li>"));
  assert.deepEqual(names.map(nameKey), ["bjork", "sigur ros"]);
});

test("delingen skiller navn, men river ikke i stykker ett navn", () => {
  assert.deepEqual(splitOnSeparators("Aurora, Björk • CMAT"), ["Aurora", "Björk", "CMAT"]);
  // Bindestrek uten mellomrom er del av navnet, ikke et skilletegn.
  assert.deepEqual(splitOnSeparators("blink-182"), ["blink-182"]);
  assert.deepEqual(splitOnSeparators("Nick Cave and the Bad Seeds"), [
    "Nick Cave and the Bad Seeds",
  ]);
});

test("en kjent kort tittel spiser ikke et lengre navn", () => {
  // «Airbourne» inneholder «Air». Var oppryddingen i read() en substrengsjekk,
  // ville et ekte bandnavn blitt kastet ut av bunken modellen får se.
  assert.deepEqual(splitOnSeparators("Airbourne"), ["Airbourne"]);
  assert.equal(splitOnSeparators("Airbourne").length, 1, "ingen deling, altså ingen opprydding");
});

/* --------------------------------------------------- former sider har ---- */

// Disse er bygget etter formen ekte festivalsider har, ikke hentet fra dem:
// miljøet testene kjøres i slipper ikke ut på nettet. De dekker parsingen,
// ikke rotet en ekte side kan finne på. Første ordentlige prøve er den første
// natta jobben kjører -- se prøveperioden i docs/plan-2027-oppdatering.md.

test("plakat i rutenett, slik de fleste ser ut", () => {
  const html = `
    <header><nav><a href="/tickets">Tickets</a><a href="/info">Info</a></nav></header>
    <h1>Line-up 2027</h1>
    <div class="grid">
      <div class="artist"><h3>Fever Ray</h3><span class="stage">Main Stage</span></div>
      <div class="artist"><h3>Sigur R&oacute;s</h3><span class="stage">Forest</span></div>
      <div class="artist"><h3>Nick Cave and the Bad Seeds</h3></div>
    </div>`;
  const names = candidates(toText(html)).map((c) => cleanName(c).name);
  for (const n of ["Fever Ray", "Sigur Rós", "Nick Cave and the Bad Seeds"]) {
    assert.ok(names.includes(n), `manglet «${n}» i ${JSON.stringify(names)}`);
  }
});

test("timeplan i tabell, med klokkeslett i egen kolonne", () => {
  const html = `
    <table><tr><td>21:00</td><td>Aurora</td><td>Scene 1</td></tr>
           <tr><td>22:30</td><td>CMAT</td><td>Scene 2</td></tr></table>`;
  const names = candidates(toText(html)).map((c) => cleanName(c).name);
  assert.ok(names.includes("Aurora"));
  assert.ok(names.includes("CMAT"));
});

test("hele lineupen på én linje, skilt med bullets", () => {
  const html = "<p>Aurora • Björk • CMAT • Dua Lipa • Enslaved</p>";
  const names = candidates(toText(html)).map((c) => cleanName(c).name);
  for (const n of ["Aurora", "Björk", "CMAT", "Dua Lipa", "Enslaved"]) {
    assert.ok(names.includes(n), `manglet «${n}»`);
  }
});

test("et JavaScript-skall gir for lite tekst til å bygge noe på", () => {
  // read() stopper under 200 tegn. Å late som noe annet ville gitt et forslag
  // basert på en cookie-banner.
  const html = `<div id="root"></div><script>window.__DATA__={lineup:["Aurora"]}</script>`;
  assert.ok(toText(html).length < 200);
});

test("fjorårets plakat røper seg på årstallene", () => {
  // Den viktigste vurderingen modellen gjør. Koden svarer ikke på den, men
  // den skal legge tallene på bordet.
  const text = toText("<h1>Line-up 2026</h1><p>Takk for i år! Vi ses i 2027.</p>");
  const years = {};
  for (const m of text.matchAll(/\b(20[2-3]\d)\b/g)) years[m[1]] = (years[m[1]] ?? 0) + 1;
  assert.deepEqual(years, { 2026: 1, 2027: 1 });
});

/* ------------------------------------------------ forslaget som bygges ---- */

const BASE = {
  slug: "testfest",
  year: 2027,
  source_url: "https://testfest.example/lineup",
  confidence: "high",
};

const EDITION = {
  date_from: "2027-06-10",
  date_to: "2027-06-12",
  program: [
    { date: "2027-06-10", artists: [{ name: "Aurora" }, { name: "Björk" }] },
  ],
};

test("et vanlig forslag blir til operasjoner", () => {
  const { ops } = buildOps(
    { ...BASE, add: [{ date: "2027-06-11", name: "CMAT" }] },
    EDITION,
  );
  assert.deepEqual(ops.add, [{ date: "2027-06-11", name: "CMAT" }]);
  assert.deepEqual(ops.remove, []);
  assert.deepEqual(ops.move, []);
  assert.ok(!("dates" in ops), "uten dates i forslaget skal det ikke stå noe der");
});

test("en dato utenfor festivalens periode avvises", () => {
  // Dette er den dyreste feilen som finnes her: en slik dag lagres uten
  // innvending og vises deretter aldri i appen.
  assert.throws(
    () => buildOps({ ...BASE, add: [{ date: "2027-07-01", name: "CMAT" }] }, EDITION),
    /ligger utenfor 2027-06-10–2027-06-12/,
  );
});

test("navn som allerede står der blir ikke foreslått på nytt", () => {
  const { ops, warnings } = buildOps(
    { ...BASE, add: [{ date: "2027-06-10", name: "aurora" }, { date: "2027-06-10", name: "CMAT" }] },
    EDITION,
  );
  assert.deepEqual(ops.add, [{ date: "2027-06-10", name: "CMAT" }]);
  assert.ok(warnings.some((w) => w.includes("sto der fra før")));
});

test("samme navn to ganger samme dag blir ett", () => {
  const { ops } = buildOps(
    { ...BASE, add: [{ date: "2027-06-11", name: "CMAT" }, { date: "2027-06-11", name: "cmat" }] },
    EDITION,
  );
  assert.equal(ops.add.length, 1);
});

test("klokkeslett strippes, og det sies fra om det", () => {
  const { ops, warnings } = buildOps(
    { ...BASE, add: [{ date: "2027-06-11", name: "21:00 Fever Ray" }] },
    EDITION,
  );
  assert.deepEqual(ops.add, [{ date: "2027-06-11", name: "Fever Ray" }]);
  assert.ok(warnings.some((w) => w.includes("klokkeslett strippet")));
});

test("scene og klokkeslett følger aldri med som egne felt", () => {
  // Tekst i stage eller time gjør artisten usøkbar i appen.
  const { ops } = buildOps(
    { ...BASE, add: [{ date: "2027-06-11", name: "CMAT", stage: "Main", time: "21:00" }] },
    EDITION,
  );
  assert.deepEqual(Object.keys(ops.add[0]).sort(), ["date", "name"]);
});

test("et nytt år får base null, så godkjenningen oppretter det", () => {
  const { ops } = buildOps(
    { ...BASE, dates: { from: "2027-08-01", to: "2027-08-03" }, add: [] },
    null,
  );
  assert.deepEqual(ops.dates, { from: "2027-08-01", to: "2027-08-03", base: null });
});

test("basen leses fra utgaven, ikke fra forslaget", () => {
  // Konfliktsjekken er hele poenget: hadde modellen fått oppgi hva basen var,
  // kunne den skrevet over en rettelse gjort i mellomtiden.
  const { ops } = buildOps(
    {
      ...BASE,
      dates: { from: "2027-06-11", to: "2027-06-13", base: { from: "1900-01-01", to: "1900-01-02" } },
      add: [],
    },
    EDITION,
  );
  assert.deepEqual(ops.dates.base, { from: "2027-06-10", to: "2027-06-12" });
});

test("datoer i feil år hører til en annen rad", () => {
  assert.throws(
    () => buildOps({ ...BASE, dates: { from: "2026-06-10", to: "2026-06-12" } }, EDITION),
    /hører til 2026/,
  );
});

test("en festival på tre måneder er en skrivefeil", () => {
  assert.throws(
    () => buildOps({ ...BASE, dates: { from: "2027-01-01", to: "2027-12-31" } }, null),
    /ikke en festival/,
  );
});

test("nye datoer avgjør spennet for tilføyelsene", () => {
  // Ellers ville en lineup til et helt nytt år blitt målt mot et spenn som
  // ikke finnes ennå, og hver eneste artist avvist.
  const { ops } = buildOps(
    {
      ...BASE,
      dates: { from: "2027-08-01", to: "2027-08-03" },
      add: [{ date: "2027-08-02", name: "CMAT" }],
    },
    null,
  );
  assert.equal(ops.add.length, 1);
});

test("roboten kommer ikke rundt fjerning ved å be pent", () => {
  assert.throws(
    () => buildOps({ ...BASE, remove: [{ date: "2027-06-10", name: "Aurora" }] }, EDITION),
    /fjerner og flytter ikke/,
  );
  assert.throws(
    () => buildOps({ ...BASE, move: [{ from: "2027-06-10", to: "2027-06-11", name: "Aurora" }] }, EDITION),
    /fjerner og flytter ikke/,
  );
});

test("et forslag uten kilde eller sikkerhet stoppes før det når basen", () => {
  assert.throws(() => buildOps({ ...BASE, source_url: undefined, add: [] }, EDITION), /source_url/);
  assert.throws(() => buildOps({ ...BASE, confidence: "kanskje", add: [] }, EDITION), /confidence/);
});

test("et tomt forslag skal bli en merknad i stedet", () => {
  assert.throws(() => buildOps({ ...BASE, add: [] }, EDITION), /Bruk «note» i stedet/);
});

test("et år som ikke finnes kan ikke få program uten datoer", () => {
  assert.throws(
    () => buildOps({ ...BASE, add: [{ date: "2027-06-11", name: "CMAT" }] }, null),
    /ingen datoer å opprette den med/,
  );
});

/* ------------------------------------ det Roskildes forside laerte oss ---- */

// Den foerste ekte sida roboten leste, 31. august 2026. Den fant ingen
// artister -- ikke fordi parsingen sviktet, men fordi vaktlisten pekte paa
// forsiden, og der staar det ingen lineup. Testene under er skrevet etter det.

test("en nedtrekksliste er aldri en lineup", () => {
  // Roskildes nyhetsbrevskjema har en landliste. Uten dette kom «British
  // Virgin Islands» og «Federated States of Moldova» inn i bunken modellen
  // skulle lese -- 250 navn som ser ut som kandidater og ikke er det.
  const html = `
    <h2>Line-up</h2><li>Aurora</li>
    <select name="land"><option>Norway</option><option>Virgin Islands, British</option></select>`;
  const text = toText(html);
  assert.ok(text.includes("Aurora"));
  assert.ok(!text.includes("Norway"), "innholdet i <select> skal bort");
  assert.ok(!text.includes("Virgin Islands"));
});

test("lenken til programsiden blir funnet", () => {
  const html = `
    <nav>
      <a href="/nyheder">Nyheder</a>
      <a href="/program">Program</a>
      <a href="/praktisk">Praktisk info</a>
      <a href="/en/line-up/">Se hele line-up</a>
    </nav>`;
  const links = lineupLinks(html, "https://www.roskilde-festival.dk/");
  const urls = links.map((l) => l.url);
  assert.ok(urls.includes("https://www.roskilde-festival.dk/program"));
  assert.ok(urls.includes("https://www.roskilde-festival.dk/en/line-up/"));
  assert.ok(!urls.some((u) => u.includes("praktisk")), "praktisk info er ikke en lineup");
});

test("lenker ut av huset følges ikke", () => {
  // En «line-up»-lenke til Ticketmaster fører til noen andres data -- nøyaktig
  // kilden dette prosjektet gikk bort fra i august.
  const html = `
    <a href="https://www.ticketmaster.dk/lineup">Line-up</a>
    <a href="mailto:info@fest.no?subject=program">Program</a>
    <a href="/lineup">Line-up</a>`;
  const urls = lineupLinks(html, "https://fest.no/").map((l) => l.url);
  assert.deepEqual(urls, ["https://fest.no/lineup"]);
});

test("samme side to ganger blir én lenke", () => {
  const html = `<a href="/program">Program</a><a href="/program#dag2">Programmet</a>`;
  assert.equal(lineupLinks(html, "https://fest.no/").length, 1);
});

/* ------------------------------- fjoraarets plakat, som staar for lenge --- */

// Roskildes programside, 31. august 2026: «26/6 - 3/7 2027» oeverst, og
// fjoraarets 174 artister under. Aarstallstelling svarte feil paa den siden.
// Opptelling mot det lagrede programmet svarer riktig.

const EDITIONS = [
  {
    year: 2027,
    program: [],
  },
  {
    year: 2026,
    program: [
      { date: "2026-07-01", artists: [{ name: "Gorillaz" }, { name: "The Cure" }] },
      { date: "2026-07-02", artists: [{ name: "Zara Larsson" }, { name: "Addison Rae" }] },
    ],
  },
];

test("fjorårets program på siden røper seg som overlapp", () => {
  const påSiden = ["Gorillaz", "The Cure", "Zara Larsson", "Addison Rae", "Ny!"];
  const treff = matchEditions(påSiden.map(nameKey), EDITIONS);

  const y2026 = treff.find((t) => t.year === 2026);
  assert.equal(y2026.in_edition, 4);
  assert.equal(y2026.on_page, 4);
  assert.equal(y2026.share, 1, "hele fjorårets program står på siden");

  const y2027 = treff.find((t) => t.year === 2027);
  assert.equal(y2027.share, 0, "2027 har ingenting lagret ennå");
});

test("et helt nytt program overlapper med ingenting", () => {
  // Motsatt vei: det er nettopp da det er noe å hente.
  const treff = matchEditions(["fever ray", "cmat"].map(nameKey), EDITIONS);
  assert.equal(treff.find((t) => t.year === 2026).on_page, 0);
});

test("navn med aksenter og klokkeslett teller likevel med", () => {
  // Overlappet måles på samme nøkkel som resten: uten det ville «Širom» på
  // siden og «Širom» i basen sett ut som to ulike artister.
  const editions = [
    { year: 2026, program: [{ date: "2026-07-01", artists: [{ name: "Širom" }] }] },
  ];
  assert.equal(matchEditions([nameKey("Sirom")], editions)[0].on_page, 1);
});

test("nyeste år først, så det viktigste står øverst", () => {
  const treff = matchEditions([], EDITIONS);
  assert.deepEqual(treff.map((t) => t.year), [2027, 2026]);
});

test("oversikten slår de 200 undersidene av den", () => {
  // Roskildes programside lenker til én side per artist, alle med «/program/»
  // i adressen. Uten rangering druknet «/program» i sine egne barn.
  const html = `
    <a href="/program/musik/gorillaz">Gorillaz</a>
    <a href="/program/musik/jennie">Jennie</a>
    <a href="/program">Program</a>
    <a href="/program/musik">Musik</a>`;
  const urls = lineupLinks(html, "https://rf.dk/").map((l) => l.url);
  assert.equal(urls[0], "https://rf.dk/program", "grunneste adresse først");
  assert.equal(urls[1], "https://rf.dk/program/musik");
});

test("listen kappes, så den er til å velge fra", () => {
  const html = Array.from({ length: 60 }, (_, i) => `<a href="/program/a${i}">Artist ${i}</a>`).join("");
  assert.equal(lineupLinks(html, "https://rf.dk/").length, 20);
});

/* ------------------------------------------------- aa peke paa datoen ---- */

test("linjene med årstallet plukkes ut, med teksten rundt", () => {
  const text = [
    "Home",
    "Info",
    "20 maart 2027 – Sportpaleis Antwerpen",
    "Tickets",
    "© 2026 Reverze",
  ].join("\n");
  assert.deepEqual(yearLines(text, 2027), ["20 maart 2027 – Sportpaleis Antwerpen"]);
});

test("den avgjør ingenting, den peker", () => {
  // «© 2027» og «20 maart 2027» kommer begge med. Å skille dem er en
  // vurdering, og den hoerer hjemme hos et hode -- ikke i en regex.
  const text = "20 maart 2027\n© 2027 Reverze\nBillett til 2027";
  assert.equal(yearLines(text, 2027).length, 3);
});

test("et helt avsnitt kappes, så listen er til å lese", () => {
  const langt = "Vi gleder oss til 2027. " + "Mer tekst. ".repeat(40);
  const [linje] = yearLines(langt, 2027);
  assert.ok(linje.length <= 161, `for lang: ${linje.length}`);
  assert.ok(linje.endsWith("…"));
});

test("årstall inne i et annet tall teller ikke", () => {
  // Ordgrense, ellers ville «12027» og «2027-tallet» gitt falske treff.
  assert.deepEqual(yearLines("Ordrenummer 120275", 2027), []);
});

test("listen har en topp", () => {
  const text = Array.from({ length: 80 }, (_, i) => `Linje ${i} om 2027`).join("\n");
  assert.equal(yearLines(text, 2027).length, 25);
});
