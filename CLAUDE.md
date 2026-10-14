# Tunetrail

Europeisk festivalguide med kart, datoer, program, publikumsstørrelse og
sjangerguider. Live på tune-trail.org. Next.js 16 (App Router) + Supabase, fem
språk: nb (uten prefiks i URL-en), en, de, fr, es.

@AGENTS.md

## Hvem du jobber med

Michelle eier prosjektet og er designer, ikke utvikler. Hun kjenner dataene
godt, men skriver ikke kode og er ikke hjemme i terminalen.

- **Forklar på designspråk.** Hva brukeren ser, hvilke tilstander som finnes,
  hva som endrer seg. Et teknisk ord som ikke kan unngås, forklares med noen få
  vanlige ord.
- **Si hvor noe skal kjøres før du gir det:** «I Supabase → SQL Editor», «I
  terminalen», «I Vercel». Én destinasjon per blokk, aldri SQL og terminal i
  samme instruks. Si hva et vellykket resultat ser ut som.
- **Aldri plassholdere i kommandoer.** `<slug>` blir limt inn ordrett. Skriv den
  ferdige kommandoen.
- **Svar på norsk.**

## Slik leser du databasen

Det finnes ingen direkte tilkobling: ingen `psql`, ingen MCP-server. Lesing går
via Supabase sitt REST-API med anon-nøkkelen, som følger radnivåsikkerheten. Den
slipper gjennom til `festivals` og `festival_editions`, og til `profiles`
(visningsnavn er offentlige med vilje, så et bidrag kan vise «foreslått av» —
men tabellen har også `is_admin`, så skriv ikke ut innholdet uten grunn).
`submissions` og resten gir ingenting.

Bruk skriptet. Det leser nøkkelen fra `.env.local` selv, så du verken ser eller
skriver den:

```bash
node --env-file=.env.local scripts/les-db.mjs festivals select=slug,name slug=eq.neopop
node --env-file=.env.local scripts/les-db.mjs festivals size_band=is.null --antall
node --env-file=.env.local scripts/les-db.mjs festivals "select=*,festival_editions(*)" --ut=/tmp/festivaler.json
```

Alle valg og flere eksempler står øverst i `scripts/les-db.mjs`. Spørringsspråket
er PostgREST: `eq.`, `in.(a,b)`, `is.null`, `cs.{Metal}`, `or=(...)`, og
`festival_editions(year,date_from)` henter utgavene i samme kall. Store uttrekk
går til en fil med `--ut=` og analyseres derfra.

Finner skriptet ikke `.env.local`, sier det fra. Det gjelder skyøkter — fila er
git-ignorert med vilje — og betyr at du ikke har tilgang til databasen: skriv
spørringen som SQL og be Michelle kjøre den i SQL Editor. Gjett aldri på data du
ikke har lest.

## Hvordan endringer når produksjon

- **Kode:** push til `main`, så bygger og publiserer Vercel. Det finnes ingen
  staging.
- **Data:** Michelle kjører SQL selv i Supabase SQL Editor. Lever en fil i
  `supabase/` (engangsrettinger) eller `supabase/migrations/` (skjema). Sjekk i
  basen at den faktisk er kjørt før du bygger videre på den — «kjørt» betyr
  ingenting hvis fila traff null rader.
- **Hurtigbuffer:** sidene har `revalidate = 900`. En dataendring kan ta inntil
  15 minutter å vise seg, og en ny festival-URL som ble besøkt før raden fantes,
  kan vise 404 i det samme vinduet.
- **`.env.local`** har `SUPABASE_SERVICE_ROLE_KEY` (robotskriptet og
  `/api/watch` bruker den). Den går
  forbi all tilgangskontroll: skriv den aldri ut, lim den aldri inn noe sted, og
  bruk den ikke til å skrive data. Til lesing holder anon-nøkkelen, se over.

## Regler som har kostet noe å lære

1. **Slå opp slugs i basen, skriv dem aldri for hånd.** En `insert … select` mot
   en slug som ikke finnes, legger inn null rader uten feilmelding. SQL som
   skriver til én bestemt festival, skal stoppe med en feil hvis den ikke finner
   den.
2. **Vercel bygger fra commiten, ikke fra disken.** Etter `git add`: se i
   `git status --short` at ingen endret fil står igjen. Typesjekk det som faktisk
   er committet (`git archive HEAD` til en tom mappe, så `npx tsc --noEmit`).
   Feiler bygget, be Michelle kjøre `npx vercel login` og `npx vercel inspect`
   med deploy-ID-en ferdig utfylt — ikke gjett på årsaken.
3. **Et nytt felt på `festivals` må inn tre steder:** hvitlisten i
   `apply_submission` (migrasjon), `EDITABLE_FIELDS` i `src/lib/submissions.ts`,
   og admin-diffen. `subgenres` er foreløpig bare i hvitlisten, så bidragsytere
   kan ikke foreslå undersjanger.
4. **Ingenting irreversibelt uten et klart ja.** Aldri `delete from festivals`.
   Sletting av en utgave leveres som egen fil, aldri sammen med annet.
5. **Automatikk skriver aldri rett i tabellene,** bare via `submissions` og
   moderering. Roboten er sperret i databasen fra å fjerne eller flytte artister
   og fra å opprette festivaler (`guard_robot_submission`).
   Ticketmaster-berikelsen er slått av fordi den ødela data i august.
6. **Tagger sier hvilke sjangre som forekommer, ikke hva festivalen er.** Om en
   festival hører hjemme i en guide, avgjøres på line-up, ikke på navn eller
   tagger.
7. **Skriv ikke tall som endrer seg i dokumentasjon** (antall festivaler,
   dekning). Les dem fra basen.

## Datamodellen

- `festivals`: én rad per festival. Sted og koordinater, `tags[]` (sjangre som
  forekommer), `category` (én hovedsjanger — en annen liste enn tags),
  `size_band` (seks publikumstrinn) og `subgenres[]`. De tre siste er nøkler med
  CHECK i databasen. Listene og rekkefølgen defineres i `src/lib/festivals.ts`,
  visningsteksten i `messages/`.
- `festival_editions`: én rad per festival per år — datoer, billettlenke og
  `program` (jsonb, dag for dag). `9999-12-31` i programmet betyr «dag ikke
  bestemt».
- All skriving går via `SECURITY DEFINER`-funksjoner som kalles med RPC. Anon kan
  bare lese.

## Guidene

`src/lib/guides.ts` og `src/app/[locale]/guider/[guide]/page.tsx`. To former:

- **Kuraterte** (jazz, Frankrike, Norden): rangert slugliste, vist som tabell,
  kort og måned for måned.
- **Bla-guider** (rock/metal, elektronisk): alle festivaler med `browseTags`,
  filtrert med `browseRule` — over halvparten av taggene i `core`, en festival
  med en `mainstream`-tagg trenger en `anchor`-tagg, og `exclude` har en
  begrunnelse per slug. Rock/metal grupperes på `size_band`, elektronisk på
  `subgenres` (`axis`), der en festival står i hver undersjanger den har.

Datoer i guidene har alltid årstall. En festival uten kommende utgave står som
«ikke annonsert» (`hasUpcomingDate`), og line-upen faller tilbake på siste
utgave med program, merket med året. Guideåret utledes av kommende utgaver
(`guideYear`). Forsiden er guideoversikten (`hubYear`).

## Hvor ting ligger

- Nattjobben, roboten som foreslår datoer og program:
  `.claude/skills/nattlig-oppdatering/SKILL.md` og `scripts/robot-nightly.mjs`.
  Overleveringen fra august: `docs/nattjobb-status.md`.
- Research av publikumstall: `docs/prompt-publikumstall.md`, ferdige bolker i
  `docs/bolker/`.
- Planer og bakgrunn: `docs/`. Tidligere SQL-rettinger: `supabase/`.
