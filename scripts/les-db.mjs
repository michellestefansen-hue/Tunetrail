#!/usr/bin/env node
/**
 * Leser fra databasen. Bare lesing.
 *
 * Bruker anon-nøkkelen, så radnivåsikkerheten gjelder: anon slipper gjennom til
 * `festivals`, `festival_editions` og `profiles` (visningsnavn er offentlige med
 * vilje -- men skriv ikke ut innholdet uten grunn, tabellen har også is_admin).
 * Nøkkelen leses av Node fra .env.local (--env-file) og skrives aldri ut, så
 * verken Michelle eller en modell trenger å se den. Samme mønster som
 * scripts/robot-nightly.mjs.
 *
 * Bruk, fra tunetrail-mappen:
 *
 *   node --env-file=.env.local scripts/les-db.mjs <tabell> [nøkkel=verdi ...] [valg]
 *
 * Hvert argument etter tabellen er én parameter i Supabase sitt REST-språk
 * (PostgREST). Verdiene URL-kodes her, så mellomrom og & går bra.
 *
 * Valg:
 *   --antall            bare antall rader som treffer
 *   --tagg=A,B          festivaler med minst én av taggene (uten å skrive
 *                       PostgREST sin array-syntaks med krøllparenteser)
 *   --ut=uttrekk/x.json alt til en fil, til å analysere videre. Skrives bare
 *                       inn i uttrekk/ (git-ignorert), og bare som .json.
 *
 * Eksempler:
 *
 *   # de tre første festivalene
 *   node --env-file=.env.local scripts/les-db.mjs festivals select=slug,name limit=3
 *
 *   # én festival med alle utgavene sine
 *   node --env-file=.env.local scripts/les-db.mjs festivals "select=slug,festival_editions(year,date_from,date_to)" slug=eq.neopop
 *
 *   # festivaler med en av to tagger
 *   node --env-file=.env.local scripts/les-db.mjs festivals select=slug,name "--tagg=Rock,Metal"
 *
 *   # bare antallet som mangler størrelse
 *   node --env-file=.env.local scripts/les-db.mjs festivals size_band=is.null --antall
 *
 *   # alt til en fil (skriver bare antallet til skjermen)
 *   node --env-file=.env.local scripts/les-db.mjs festivals "select=*,festival_editions(*)" --ut=uttrekk/festivaler.json
 *
 * Supabase svarer med maks 1000 rader per kall.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const FEIL_BRUK = 2;
const FEIL_SVAR = 1;
const VIS_MAKS = 100;
const UT_MAPPE = resolve("uttrekk");

function avbryt(melding, kode) {
  console.error(melding);
  process.exit(kode);
}

const args = process.argv.slice(2);
const valg = args.filter((a) => a.startsWith("--"));
const tabell = args.find((a) => !a.startsWith("--") && !a.includes("="));
const bareAntall = valg.includes("--antall");
const utFil = valg.find((a) => a.startsWith("--ut="))?.slice("--ut=".length);
const tagger = valg
  .find((a) => a.startsWith("--tagg="))
  ?.slice("--tagg=".length)
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const parametre = args.filter((a) => a !== tabell && !a.startsWith("--"));

const KJENTE_VALG = ["--antall", "--ut=", "--tagg="];
for (const v of valg) {
  if (!KJENTE_VALG.some((k) => v === k || v.startsWith(k))) {
    avbryt(`Ukjent valg: ${v}\nKjente valg: --antall, --tagg=A,B, --ut=uttrekk/<fil>.json`, FEIL_BRUK);
  }
}

if (!tabell || !/^[a-z_]+$/.test(tabell)) {
  avbryt(
    "Bruk: node --env-file=.env.local scripts/les-db.mjs <tabell> [nøkkel=verdi ...] [--antall] [--tagg=A,B] [--ut=uttrekk/<fil>.json]\n" +
      "Tabellnavn er små bokstaver og understrek, for eksempel festivals.",
    FEIL_BRUK,
  );
}

// Sjekkes før noe annet skjer. Kommandoen er forhåndsgodkjent i
// .claude/settings.json, og radene den skriver kommer fra databasen -- tekst
// vi ikke har skrevet selv. Derfor kan --ut bare skrive i én mappe, som er
// git-ignorert, og bare .json. Ellers var det en måte å overskrive en hvilken
// som helst fil uten at noen blir spurt.
let utSti = null;
if (utFil !== undefined) {
  utSti = resolve(utFil);
  if (!utSti.startsWith(UT_MAPPE + sep) || !utSti.endsWith(".json")) {
    avbryt(
      "--ut må peke inn i uttrekk/ og slutte på .json, for eksempel --ut=uttrekk/festivaler.json",
      FEIL_BRUK,
    );
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nokkel = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !nokkel) {
  avbryt(
    "Fant ikke databaseadressen eller nøkkelen.\n" +
      "Kjør fra tunetrail-mappen og ta med --env-file=.env.local.\n" +
      "Finnes ikke .env.local (den er git-ignorert, så den følger ikke med til en skyøkt),\n" +
      "har du ikke tilgang til databasen herfra. Skriv spørringen som SQL i stedet og be\n" +
      "Michelle kjøre den i Supabase → SQL Editor.",
    FEIL_BRUK,
  );
}

const sporring = parametre.map((p) => {
  const i = p.indexOf("=");
  if (i < 1) avbryt(`«${p}» er ikke på formen nøkkel=verdi.`, FEIL_BRUK);
  return `${p.slice(0, i)}=${encodeURIComponent(p.slice(i + 1))}`;
});
if (tagger?.length) {
  const bolker = tagger.map((t) => `tags.cs.{${t}}`).join(",");
  sporring.push(`or=${encodeURIComponent(`(${bolker})`)}`);
}

const headere = { apikey: nokkel, Authorization: `Bearer ${nokkel}` };
if (bareAntall) Object.assign(headere, { Prefer: "count=exact", Range: "0-0" });

const svar = await fetch(
  `${url}/rest/v1/${tabell}${sporring.length ? `?${sporring.join("&")}` : ""}`,
  { headers: headere },
).catch((feil) => avbryt(`Kom ikke fram til databasen: ${feil.message}`, FEIL_SVAR));

if (!svar.ok) {
  const tekst = await svar.text();
  const hint =
    svar.status === 401 || svar.status === 403
      ? "\nAnon-nøkkelen har ikke tilgang hit. Det er riktig for alt unntatt festivals, festival_editions og profiles."
      : "";
  avbryt(`Databasen svarte ${svar.status}: ${tekst}${hint}`, FEIL_SVAR);
}

if (bareAntall) {
  // «0-0/731», eller «*/0» når ingenting traff.
  console.log(svar.headers.get("content-range")?.split("/")[1] ?? "ukjent");
  process.exit(0);
}

const rader = await svar.json();
if (utSti) {
  mkdirSync(dirname(utSti), { recursive: true });
  writeFileSync(utSti, JSON.stringify(rader));
  console.log(`${rader.length} rader skrevet til ${utFil}`);
} else {
  // Én rad per linje, så det er lett å lese og lett å lete i.
  console.log(`[\n${rader.slice(0, VIS_MAKS).map((r) => JSON.stringify(r)).join(",\n")}\n]`);
  if (rader.length > VIS_MAKS) {
    console.error(
      `\n(viste ${VIS_MAKS} av ${rader.length}. Smalere select=, limit= eller --ut=uttrekk/<fil>.json gir resten.)`,
    );
  }
}
