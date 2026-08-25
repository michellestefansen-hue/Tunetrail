---
name: nattlig-oppdatering
description: Oppdater 5-10 festivaler med datoer og program for et kommende år ved å lese festivalenes egne nettsteder, og send funnene som forslag til godkjenning. Brukes av den nattlige Routine-kjøringen, og kan kjøres for hånd når som helst.
---

# Nattlig oppdatering av festivaldata

Du fyller inn neste års datoer og programmer i Tunetrail ved å lese
festivalenes egne nettsteder. Du skriver aldri til databasen. Du sender
forslag, som ligger i en kø til et menneske godkjenner dem.

Bakgrunnen står i `docs/plan-2027-oppdatering.md`. Les den hvis noe her er
uklart — særlig punkt 2 og 8.

## Før du begynner

Sjekk at `SUPABASE_SERVICE_ROLE_KEY` og `NEXT_PUBLIC_SUPABASE_URL` er satt.
Er de ikke det, stopp og si fra — ikke prøv å komme rundt det.

Alle kommandoer kjøres slik:

```bash
node --env-file=.env.local scripts/robot-nightly.mjs <kommando>
```

## Slik går en natt

### 1. Hent nattens utvalg

```bash
node --env-file=.env.local scripts/robot-nightly.mjs pick --count 8 --year 2027
```

Du får en liste med `reason` på hver: `siden har endret seg`, `ingen
2027-utgave`, `utgave uten program`, `rundgang`. Ta dem i den rekkefølgen de
kommer. Ikke plukk selv, og ikke hopp over noen fordi de ser kjedelige ut —
rekkefølgen er der for at hele listen skal bli gått gjennom over tid.

### 2. Les siden

```bash
node --env-file=.env.local scripts/robot-nightly.mjs read <slug>
```

Du får tilbake:

- `years_mentioned` — hvilke årstall står på siden, og hvor ofte
- `known_artists` — navn som allerede finnes i databasen. Disse trenger ingen
  vurdering fra deg; de *er* artistnavn.
- `unknown_candidates` — alt annet som kan være et navn. Dette er bunken du
  skal lese.
- `text` — siden som lesbar tekst, til å avgjøre sammenhengen

Ligger lineupen på en underside, kjør `read <slug> --url <adressen>`.

### 3. Vurder

Dette er hele grunnen til at det er du og ikke et skript som gjør dette.

**Det viktigste spørsmålet først: er dette riktig år?** En festival som var i
august viser fjorårets plakat i månedsvis etterpå. Står `2026` femten ganger
og `2027` én gang i en bunntekst, ser du på fjorårets side. Da lager du ikke
et forslag. Se punkt 5.

Deretter:

- **Er datoene bekreftet?** «Save the date», et hotelltilbud eller en
  nedtelling er ikke en kunngjøring. Er du i tvil, send datoene med
  `"confidence": "low"` og skriv hvorfor i `note`.
- **Hvilke av `unknown_candidates` er artister?** Sponsorer, menypunkter,
  scenenavn, «Kjøp billett» og partnerlogoer ligger i samme bunke. Er du i
  tvil om et enkelt navn, la det være — ett navn er ikke verdt et feilaktig
  forslag, og neste runde tar det.
- **Hvilken dag spiller de?** Sier siden bare «fredag», regn deg fram fra
  datoene. Er det ikke mulig å avgjøre, legg dem på første dag og skriv i
  `note` at dagfordelingen er usikker, med `"confidence": "low"`.

### 4. Send forslaget

Skriv en JSON-fil og send den:

```json
{
  "slug": "roskilde-festival",
  "year": 2027,
  "source_url": "https://www.roskilde-festival.dk/en/line-up/",
  "confidence": "high",
  "note": "Sto under «Line-up 2027». Datoene bekreftet på forsiden.",
  "dates": { "from": "2027-06-26", "to": "2027-07-03" },
  "add": [
    { "date": "2027-06-26", "name": "Fever Ray" },
    { "date": "2027-06-27", "name": "CMAT" }
  ]
}
```

```bash
node --env-file=.env.local scripts/robot-nightly.mjs propose forslag.json
```

`dates` utelates hvis året allerede finnes med riktige datoer. `add` utelates
hvis du bare fant datoene. Minst én av dem må være der.

**`note` er ikke pynt.** Den vises i køen, og den er det eneste et menneske
har å gå på når det skal avgjøre om det skal stole på deg. Skriv hvor på siden
du fant det, og hva du var usikker på.

### 5. Eller si at det ikke ble noe

```bash
node --env-file=.env.local scripts/robot-nightly.mjs note <slug> "fant bare 2026-plakaten, ingen 2027-datoer publisert"
```

**Dette er en like god utgang som et forslag.** Du har lov til å gi opp, og du
skal gi opp når du er i tvil om selve grunnlaget. En kø full av «kanskje?» er
en kø som slutter å bli lest, og da er hele ordningen død.

Bruk denne når:

- siden viser fjorårets plakat
- lineupen ligger i et bilde, en PDF eller et Instagram-innlegg
- siden krever JavaScript og ga for lite tekst
- datoene er «kommer snart»

Gjør dette for hver festival du ikke sender forslag for. Uten det kommer den
samme siden opp igjen i morgen, og du bruker natta på nytt på det samme.

## Reglene du ikke kommer rundt

Disse håndheves i databasen, ikke her. Prøver du likevel, får du en
feilmelding og ingenting skjer:

- **Du fjerner ikke artister.** Ikke fordi det aldri er riktig, men fordi et
  program kan være bygget av mennesker som vet mer enn nettsiden. En
  bidragsyter kan ha vært der. Du legger til.
- **Du flytter ikke artister.** En flytting er en fjerning med et ekstra steg.
- **Du oppretter ikke festivaler.** Duplikater er hovedrisikoen der, og det er
  en annen jobb.
- **Du må oppgi `source_url`.** Et forslag ingen kan etterprøve er verdiløst.
- **Du må oppgi `confidence`.** «high» eller «low». Ingen tredje verdi.

Møter du en av disse feilmeldingene, er svaret aldri å finne en vei rundt.
Bruk `note` og gå videre.

## Til slutt

Skriv en kort oppsummering: hvor mange sett på, hvor mange forslag, hvor mange
gitt opp og hvorfor. Er det et mønster i det som ikke gikk — mange sider som
krever JavaScript, mange som ikke har publisert noe — si fra om det. Det er
den observasjonen som er verdt mest over tid.
