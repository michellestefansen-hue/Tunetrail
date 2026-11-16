---
name: nattlig-nye-festivaler
description: Let etter nye europeiske festivaler som ikke finnes i Tunetrail, bygg en komplett oppføring av hver fra festivalens eget nettsted, og send de som er klare som forslag til godkjenning i /admin. Høyst tre per natt.
---

# Nattlig leting etter nye festivaler

Du finner festivaler som mangler i Tunetrail, bygger en komplett oppføring av
hver, og sender de som er klare som **forslag** til godkjenningskøen i
`/admin`. Du oppretter aldri en festival selv: ingenting blir synlig på
tune-trail.org før et menneske har godkjent det.

**Høyst tre nye per natt, og høyst fem som venter i køen.** Databasen håndhever
det. Et lavt tall er meningen: hvert forslag skal leses ordentlig.

## Før du begynner

Sjekk at tilgangen til festivallista virker, med denne kommandoen:

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs sjekk
```

Står det «MANGLER», stopp og si fra. Alle kommandoer kjøres slik:

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs <kommando>
```

### Hold deg innenfor det som er forhåndsgodkjent

Natta har ingen som kan klikke «tillat». Derfor:

- **Bli i mappen du starter i, og bruk aldri `cd`.** Du kan stå i en egen
  arbeidskopi av prosjektet og ikke i selve `tunetrail`-mappen. Det er riktig:
  skriptet finner `.env.local` i hovedmappen selv. Går du dit, stopper jobben.
- **Skriv kandidaten til en fil med kort sti: `forslag/nye/<slug>.json`**, og
  gi filen til kommandoene. Ikke legg JSON inn i selve kommandoen: lange tekster
  med «» og andre tegn gjør kommandoen uleselig for godkjenningen («Parse
  error»), og da stopper jobben. Aldri full sti (`/Users/...`, `~/...`).
- **Én kommando om gangen**, ikke slett filer, og ikke bruk `node -e`.
- **Nettsøk er godkjent. Les sider bare med `les`**, ikke med WebFetch.
- **Står `sjekk` på «MANGLER», stopp.** Ikke let etter `.env.local` selv.

## Hva som er en festival her

En **musikkfestival med flere artister, i Europa, med en kommende utgave og et
eget nettsted.** Små lokale festivaler tas med. Ikke: enkeltkonserter,
klubbkvelder, konferanser, turneer og rene matfestivaler.

## Prinsippet: intet felt uten bevis

Du skriver aldri koordinater, bilde-adresser, datoer eller land fra hukommelsen.
De kommer fra et verktøy, og kandidaten sier hvor. Det eneste du får gjette,
er det en festivalside sjelden sier rett ut: **størrelse, hovedsjanger, tagger
og undersjanger.** Hver gjetning må stå med en begrunnelse som sier hva den
bygger på. Se «Gjetting» under.

## Slik går en natt

### 1. Velg ruten

Ett land og én sjanger per natt, så den ikke leter det samme to ganger. Ta
dagens nummer i året (1 til 366), og la `dag` være det:

- **Land:** nummer `dag` modulo antall land i lista under, regnet fra null.
- **Sjanger:** nummer (`dag` delt på antall land, avrundet ned) modulo 14 i
  taggene i `src/lib/festivals.ts`, regnet fra null.

Landene, i denne rekkefølgen: Norge, Sverige, Danmark, Finland, Island,
Storbritannia, Irland, Nederland, Belgia, Tyskland, Frankrike, Spania, Portugal,
Italia, Sveits, Østerrike, Polen, Tsjekkia, Ungarn, Kroatia, Romania, Hellas,
Slovenia, Slovakia, Estland, Latvia, Litauen, Serbia, Bulgaria, Luxembourg,
Malta, Montenegro, Albania, Nord-Makedonia.

### 2. Let

Bruk nettsøk hvis du har det. Søk på landets eget språk, for eksempel «neues
Festival 2027 erstmals», «premier festival 2027», «nuevo festival 2027» eller
«ny festival 2027 første utgave», sammen med sjangeren. Det som er verdt å
finne er festivaler som kunngjør sin første utgave, eller som er nye for 2027.

Har du ikke nettsøk, si fra i oppsummeringen. Ikke finn på kandidater.

### 3. Sjekk mot basen FØR du gjør noe tungt

For hver kandidat, skriv det du vet så langt (navn, land, by og festivalens
eget nettsted) til `forslag/nye/<slug>.json`, for eksempel
`forslag/nye/nyfest.json`, og kjør:

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs kjenner forslag/nye/nyfest.json
```

Får du et treff med `"reason": "website"` eller et navn som er helt likt, finnes
festivalen. Gå videre til neste. Å finne en festival vi har fra før er ikke et
tap, det er riktig utfall. Treff med `"reason": "nearby"` er en mulighet, ikke
et svar: se på dem selv.

### 4. Les festivalens eget nettsted

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs les https://festival.example/
```

Du får tittel, språk, beskrivelse, `og_bilde`, `twitter_bilde`, lenker på
nettstedet, og **`strukturerte_data`**: det siden selv sier om arrangementet
(navn, datoer, arena, koordinater, bilde). Se dit først. Det er mer pålitelig
enn å lese det ut av teksten.

Les også programsiden, om-oss og kontakt-siden, via `lenker`. Der står ofte
arenaen og hvor stor festivalen er.

### 5. Sted

1. Står `lat` og `lon` i `strukturerte_data`, bruk dem og skriv hvor de sto.
2. Ellers, geokod arenaen:

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs geokode "Stadtpark Hamburg" --land=de
```

Bruk et treff med `"presisjon": "sted"`. Er det bare `"by"`, ligger punktet midt
i byen og ikke på arenaen: sett `"location_precision": "by"` i kandidaten, så
får forslaget lav sikkerhet og en advarsel.

Landet må skrives akkurat slik basen skriver det («Tyskland», ikke «Germany»).

### 6. Bilde

Velg festivalens eget delingsbilde (`og_bilde`, `twitter_bilde` eller bildet i
`strukturerte_data`), helst et motiv og ikke en logo. Sjekk det:

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs bilde https://festival.example/media/bilde.jpg
```

Det må svare, være et bilde, være minst 800 px bredt og ligge på https. Bilder
fra bildesøk eller bildebanker brukes ikke. Fant du ikke festivalens eget, kan
et bilde fra Wikimedia Commons med fri lisens brukes, og lisensen skal stå i
kilden.

### 7. Datoer

Bare datoer festivalen selv har kunngjort, for en utgave som ikke har vært.
«Save the date», en nedtelling og et hotelltilbud er ikke en kunngjøring.
Er datoene foreløpige, sett `"dates_status": "forelopig"`.

### 8. Sett sammen kandidaten

Slik ser en komplett kandidat ut. Skriv den til samme fil, `forslag/nye/<slug>.json`.

```json
{
  "name": "Nyfest",
  "source_url": "https://nyfest.example/",
  "website_url": "https://nyfest.example/",
  "country": "Tyskland",
  "city": "Hamburg",
  "venue_name": "Stadtpark",
  "latitude": 53.5965,
  "longitude": 10.0087,
  "date_from": "2027-07-09",
  "date_to": "2027-07-11",
  "image_url": "https://nyfest.example/media/nyfest.jpg",
  "ticket_url": "https://nyfest.example/tickets",
  "description": "Ny elektronisk festival i Stadtpark, første utgave.",
  "tags": ["Elektronisk & Dans", "Techno & House"],
  "category": "Elektronisk & Dans",
  "subgenres": ["techno", "house"],
  "size_band": "2000_10000",
  "note": "Første utgave. Annonsert i mars.",
  "sources": {
    "coordinates": "JSON-LD (geo) på forsiden",
    "dates": "JSON-LD (startDate og endDate) på forsiden",
    "image_url": "og:image på forsiden, sjekket med «bilde»",
    "location": "JSON-LD (location) på forsiden",
    "venue_name": "JSON-LD (location.name)",
    "ticket_url": "Lenken «Tickets» i menyen"
  },
  "guesses": {
    "size_band": { "basis": "Camping og tre scener ifølge /om-oss. Ligner Dekmantel (ca. 15 000), men nyere og mindre." },
    "category": { "basis": "Alle ni bekreftede artister er techno og house, se line-up-siden." },
    "tags": { "basis": "Samme grunnlag: line-upen er ren techno og house." },
    "subgenres": { "basis": "Seks av ni artister er techno, tre er house." }
  }
}
```

`description` er valgfri. Skriv den med egne ord, høyst rundt 300 tegn. Ikke
kopier tekst fra siden.

### 9. Bygg og les svaret

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs bygg forslag/nye/nyfest.json
```

Skriptet sjekker alt, og bildet og landet kontrolleres mot nettet. Svaret har:

- **`klar`**: komplett, belagt og ikke et duplikat. Dette er det et menneske
  skal få se.
- **`mangler`**: felt vi må ha, men ikke har. Prøv å skaffe dem. Lykkes du ikke,
  skriv det i oppsummeringen. Det er ikke en feil.
- **`feil`**: noe er galt eller ikke belagt. Rett det og bygg på nytt.
- **`blokkert`**: festivalen finnes trolig allerede. Gå videre.
- **`duplikater`**: mulige treff å se på selv.
- **`advarsler`**: ting et menneske bør se på.
- **`note`**: slik notatet vil se ut i køen.

Står det `klar: false`, sier `feil` og `mangler` nøyaktig hva som må til.

### 10. Send de som er klare

```bash
node --env-file-if-exists=.env.local scripts/robot-nye-festivaler.mjs send forslag/nye/nyfest.json
```

Send samme fil som du bygget.

`send` gjør hele sjekken på nytt, med nett, og sender bare hvis kandidaten er
`klar`. Svaret er `"sendt": true` og et `submission_id`. Da ligger forslaget i
`/admin`, med notatet, bildet og gjetningene merket.

Avviser databasen forslaget, står grunnen i feilmeldingen: duplikat, tak nådd,
eller noe som mangler belegg. **Det er ikke en feil å gå rundt.** Er taket nådd,
er natta ferdig for nye forslag. Skriv de som var klare i oppsummeringen, så kan
en senere natt sende dem.

Send ikke en kandidat du selv er i tvil om, selv om skriptet sier `klar`. Da
skriver du hvorfor i oppsummeringen.

## Gjetting

Du har lov til å gjette **størrelse, hovedsjanger, tagger og undersjanger**,
fordi en festivalside sjelden sier dem rett ut. Men en gjetning er aldri
tillatt uten en begrunnelse som sier hva den bygger på, og skriptet avviser
alt under 20 tegn.

**En god begrunnelse er konkret og kan etterprøves:**

- Størrelse: kapasiteten på arenaen, antall scener, camping, billettpris, eller
  en sammenlignbar festival vi kjenner. «Tre scener og camping ifølge /om-oss.
  Ligner Dekmantel, men mindre.»
- Hovedsjanger og tagger: **hvilke artister** som er bekreftet. Tagger sier hvilke
  sjangre som forekommer, ikke hva festivalen er, og det avgjøres på line-up,
  ikke på navnet. «Syv av ti bekreftede artister er death metal og black metal.»
- Undersjanger: samme, og bare for elektronisk og tung musikk, som er de eneste
  ordlistene som finnes.

**Dårlige begrunnelser, som ikke teller:** «virker som en rockefestival»,
«tror den er middels stor», «ser ut som techno». Hva ser du, og hvor?

**Har du et faktisk tall eller en faktisk linje på siden**, er det ikke en
gjetning. Legg det i `sources` i stedet («Siden sier ca. 6000 gjester per dag»),
så står det under «hentet fra siden» i notatet.

**Vet du ikke nok til å gjette med en ærlig begrunnelse**, la feltet stå tomt.
Da havner kandidaten i `mangler`, og en annen natt kan fullføre den. En tom
rute er bedre enn en gjetning uten grunnlag.

Gjetningene står i notatet under overskriften «GJETTET (står ikke på siden)»,
slik at den som leser køen ser hva som er lest og hva som er gjettet.

## Reglene du ikke kommer rundt

- **Du sender bare med `send`, og bare kandidater som er `klar`.** Du oppretter
  aldri en festival, og skriver aldri noe annet sted i databasen.
- **Du bruker aldri service-nøkkelen selv.** `send` bruker den til én ting.
- **Ingen koordinater, bilde-adresser, datoer eller land fra hukommelsen.**
- **Ingen festival du ikke har lest festivalens eget nettsted for.** En
  nyhetssak om en festival er et spor, ikke en kilde.
- Møter du en feilmelding, er svaret ikke å finne en vei rundt. Skriv det i
  oppsummeringen og gå videre.

## Til slutt

Skriv en kort oppsummering:

- hvor ruten gikk (land og sjanger), og hvor mange kandidater du fant
- hvor mange du sendte til `/admin` (med navn), hvor mange som `mangler` noe
  (og hva), og hvor mange som var duplikater
- for hver sendte festival: **alle gjetningene med begrunnelse**, så det er
  lett å se om de holder når forslaget godkjennes
- om noe ikke virket: nettsøk som manglet, sider som blokkerte, geokoderen som
  ikke svarte

Er det et mønster i det som ikke gikk, si fra. Det er den observasjonen som er
verdt mest når vi skal avgjøre om det er trygt å begynne å sende.
