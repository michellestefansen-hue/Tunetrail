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
import { toText, cleanName, nameKey, candidates, isDate, decodeEntities } from "./robot-nightly.mjs";

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
