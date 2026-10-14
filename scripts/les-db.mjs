#!/usr/bin/env node
/**
 * Leser fra databasen. Bare lesing.
 *
 * Bruker anon-nøkkelen, så radnivåsikkerheten gjelder: anon slipper gjennom til
 * `festivals` og `festival_editions`, ingenting annet. Nøkkelen leses av Node
 * fra .env.local (--env-file) og skrives aldri ut, så verken Michelle eller en
 * modell trenger å se den. Samme mønster som scripts/robot-nightly.mjs.
 *
 * Bruk, fra tunetrail-mappen:
 *
 *   node --env-file=.env.local scripts/les-db.mjs <tabell> [nøkkel=verdi ...] [--antall] [--ut=<fil>]
 *
 * Hvert argument etter tabellen er én parameter i Supabase sitt REST-språk
 * (PostgREST). Verdiene URL-kodes her, så mellomrom og & går bra.
 *
 *   # de tre første festivalene
 *   node --env-file=.env.local scripts/les-db.mjs festivals select=slug,name limit=3
 *
 *   # én festival med alle utgavene sine
 *   node --env-file=.env.local scripts/les-db.mjs festivals "select=slug,festival_editions(year,date_from,date_to)" slug=eq.neopop
 *
 *   # alle med en bestemt tagg
 *   node --env-file=.env.local scripts/les-db.mjs festivals select=slug,name "tags=cs.{Metal}"
 *
 *   # bare antallet som mangler størrelse
 *   node --env-file=.env.local scripts/les-db.mjs festivals size_band=is.null --antall
 *
 *   # alt til en fil, til å analysere videre (skriver bare antallet til skjermen)
 *   node --env-file=.env.local scripts/les-db.mjs festivals "select=*,festival_editions(*)" --ut=/tmp/festivaler.json
 *
 * Supabase svarer med maks 1000 rader per kall.
 */
import { writeFileSync } from "node:fs";

const FEIL_BRUK = 2;
const FEIL_SVAR = 1;
const VIS_MAKS = 100;

function avbryt(melding, kode) {
  console.error(melding);
  process.exit(kode);
}

const args = process.argv.slice(2);
const tabell = args.find((a) => !a.startsWith("--") && !a.includes("="));
const bareAntall = args.includes("--antall");
const utFil = args.find((a) => a.startsWith("--ut="))?.slice("--ut=".length);
const parametre = args.filter((a) => a !== tabell && !a.startsWith("--"));

if (!tabell || !/^[a-z_]+$/.test(tabell)) {
  avbryt(
    "Bruk: node --env-file=.env.local scripts/les-db.mjs <tabell> [nøkkel=verdi ...] [--antall] [--ut=<fil>]\n" +
      "Tabellnavn er små bokstaver og understrek, for eksempel festivals.",
    FEIL_BRUK,
  );
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
      ? "\nAnon-nøkkelen har ikke tilgang hit. Det er riktig for alt unntatt festivals og festival_editions."
      : "";
  avbryt(`Databasen svarte ${svar.status}: ${tekst}${hint}`, FEIL_SVAR);
}

if (bareAntall) {
  // «0-0/731», eller «*/0» når ingenting traff.
  console.log(svar.headers.get("content-range")?.split("/")[1] ?? "ukjent");
  process.exit(0);
}

const rader = await svar.json();
if (utFil) {
  writeFileSync(utFil, JSON.stringify(rader));
  console.log(`${rader.length} rader skrevet til ${utFil}`);
} else {
  // Én rad per linje, så det er lett å lese og lett å lete i.
  console.log(`[\n${rader.slice(0, VIS_MAKS).map((r) => JSON.stringify(r)).join(",\n")}\n]`);
  if (rader.length > VIS_MAKS) {
    console.error(
      `\n(viste ${VIS_MAKS} av ${rader.length}. Smalere select=, limit= eller --ut=<fil> gir resten.)`,
    );
  }
}
