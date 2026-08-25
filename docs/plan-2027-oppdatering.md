# Nattlig 2027-oppdatering

Festivalåret 2026 er snart over, og databasen tømmer seg selv. Over 300
festivaler skal ha nye datoer og nye programmer for 2027, og den beste kilden
er festivalens eget nettsted. Jobben er for stor å gjøre for hånd og for
kjedelig til å bli gjort jevnt.

Målet er ikke å gjøre alt på én natt. Målet er at *ingen festival blir stående
lenge uten at noen har sett på den* — 5–10 i natta, i det uendelige.

---

## 0. Halve jobben er allerede bygget

Det er verdt å slå fast, fordi det avgjør hvor lite som gjenstår:

**Lag 1 — endringsvakten** (`festival_watch` + `/api/watch`) kjører allerede
hver natt klokka 04, gratis, i skyen. Den svarer på ett spørsmål: *har teksten
på siden endret seg?* 25 nettsteder i døgnet dekker alle 669 på under en måned.
Den leser aldri hva som står der.

**Landingsplassen** er også ferdig. `submissions` +
`apply_program_submission` gir program som *operasjoner* (add/remove/move),
`base_snapshot` mot stille overskriving, hake per artist i køen, og
`submission_audit` som fasit på hvem som endret hva.

**Det som mangler er ett ledd:** noe som leser sidene lag 1 har flagget, og
skriver et forslag inn i køen. Det er hele denne planen.

---

## 1. Roboten sender inn. Den skriver ikke.

Alt herfra går inn som en vanlig rad i `submissions`, med `kind =
'program_edit'` og en robotprofil som avsender. Ingenting treffer
`festival_editions` uten at `apply_program_submission` har kjørt.

```sql
-- Roboten er en vanlig bruker med et navn du ser i køen.
insert into auth.users ... -- eller en profilrad opprettet manuelt
update public.profiles set display_name = 'Tunetrail-roboten'
where id = '<robot-uuid>';
```

Dette er ikke et påheng for ordens skyld. Det er den samme lærdommen som
skrudde av Ticketmaster-jobben 8. august: en nattjobb som skriver rett i basen
traff 2 av 11 ganger og ødela data. En nattjobb som skriver forslag kan ikke
ødelegge noe, uansett hvor feil den tar.

**`source_url` er obligatorisk.** Roboten skal alltid oppgi siden den leste,
slik at du kan åpne den og se selv i stedet for å tro på den.

---

## 2. Hvorfor operasjonsmodellen alene løser overskrivingsproblemet

Bekymringen er den riktige: brukerne kan vite mer enn nettsiden. En bidragsyter
som har vært på festivalen, eller som følger en artist, får med seg ting som
aldri står på forsiden. Det programmet skal ikke en robot rive ned.

Svaret ligger allerede i datamodellen. Et programforslag er ikke *et nytt
program*, det er tre lister: `add`, `remove`, `move`. **En robot som bare
sender `add`, kan ikke slette noe.** Ikke fordi den lover å la være, men fordi
språket den snakker ikke har ordet.

Derfor er standardinnstillingen:

| operasjon | robot |
|---|---|
| `add` | ja |
| `dates` | ja (se punkt 4) |
| `ticket_url` | ja |
| `remove` | **nei** som utgangspunkt |
| `move` | **nei** — en flytting er en fjerning med ekstra steg |

Det verste utfallet av en robot som bare legger til, er et navn for mye i et
program. Det verste utfallet av en robot som fjerner, er Time in Jazz slått
tilbake fra 44 artister til 12 — som faktisk skjedde 2. august 2026.

---

## 3. Når fjerning likevel skal kunne foreslås

Programmer råtner også. Avlysninger skjer. Så `remove` bør ikke være låst for
alltid — men den skal koste noe å bruke, og reglene skal stå i databasen, ikke
bare i prompten. En modell som glemmer en instruks skal møte en vegg.

**Reglene:**

1. **Aldri fjerne når siden ga færre navn enn det som ligger lagret.** Dette
   ene punktet fanger nesten alle katastrofene. Ei side som plutselig gir 8
   navn der basen har 60, er en cookie-vegg, et JavaScript-skall eller feil
   underside — det er ikke en lineup som har krympet.
2. **Aldri mer enn 5 navn, og aldri mer enn 20 % av dagens program**, i én
   innsending. En ekte avlysningsbølge er små tall. Et stort tall er en feil.
3. **Aldri fjerne fra et program et menneske har rørt sist.** Utledes uten ny
   kolonne: siste `submission_audit`-rad med `field = 'program:<år>'` for
   festivalen — kom den fra noen andre enn robotprofilen, er programmet fredet
   for fjerning. Roboten kan fortsatt legge til.
4. **Fjerning krever positiv begrunnelse per navn.** «Sto ikke på siden» er
   ikke en begrunnelse — det er fravær av bevis. «Festivalen har publisert at
   artisten er avlyst, her er lenken» er en begrunnelse. Uten den, ingen
   `remove`.

**Håndhevingen** hører hjemme i en trigger på `submissions`, ikke i prompten:

```sql
-- Skisse. Avviser innsendingen ved insert, ikke ved godkjenning --
-- en innsending som aldri kan godkjennes skal ikke fylle køen din.
create function public.check_bot_submission() returns trigger ...
  -- if submitted_by = robot and jsonb_array_length(payload->'remove') > 5
  --    then raise exception ...
```

Prompten sier hva roboten *bør*. Triggeren avgjør hva den *kan*. Bare den siste
er til å stole på.

---

## 4. Datoer før program

Det største hullet akkurat nå er ikke halve programmer — det er festivaler som
ikke har en 2027-rad i det hele tatt. En utgave uten datoer er *usynlig i
appen*; den vises ikke i listen, den kommer ikke opp på kartet.

Datoer er dessuten den enkleste jobben som finnes: ett faktum per festival,
det står som regel øverst på forsiden, og det er trivielt å kontrollere.

Modellen støtter det allerede. `dates` med `base: null` betyr «utgaven fantes
ikke da jeg sendte inn» — da opprettes den ved godkjenning, og har noen andre
rukket å lage året i mellomtiden, blir det en konflikt du får se, ikke en
overskriving. Bygget for bidragsytere i august, virker like godt her.

**Så: fase 1 er datoer for alle festivaler uten 2027-utgave. Fase 2 er
programmer.** Fase 1 gir appen tilbake flere hundre festivaler, og hver enkelt
kommer komplett — bilde, tagger, koordinater og arena bor på `festivals`, ikke
på utgaven.

---

## 5. Hvor lite AI som faktisk trengs

Dette er nøkkelen til at det ikke koster noe. Del jobben i to:

**Den deterministiske delen — ingen AI:**

- Hent siden. `/api/watch` gjør det allerede.
- Strip HTML til lesbar tekst. `normalise()` i `src/lib/watchFingerprint.ts`
  gjør allerede nøyaktig dette, og er testet mot ekte nettsteder.
- Match teksten mot `artist_names` — **12 419 unike navn** ligger der, med
  `name_key` og trigram-indeks. De aller fleste artistene på et 2027-plakat har
  spilt et sted før og finnes fra før.
- Rensingen ved døra — klokkeslett strippes, `stage`/`time` alltid null,
  nesten-duplikater, datoer utenfor perioden — er allerede kodet i
  `checkArtistName` og `submitAll`.

**Den delen som trenger et hode:**

- Restposten: hvilke ukjente strenger er artistnavn og hvilke er sponsorer,
  menypunkter og scenenavn?
- Er dette 2027-plakaten, eller står fjorårets fortsatt på forsiden? *Denne
  ene vurderingen er den viktigste på hele siden.*
- Hvilken dag spiller de, når siden bare sier «fredag»?
- Er datoene på siden bekreftet, eller er de «save the date» og et hotelltilbud?

Bare restposten sendes til modellen. For 5–10 festivaler i natta er det små
mengder tekst — godt innenfor et abonnement.

---

## 6. Hvordan den kjøres, uten å betale for AI-bruk

**Anbefalingen: en Routine i Claude Code på nett** (`claude.ai/code`), cron
`0 2 * * *`, ny sesjon per kjøring. Den kjører på Claude-abonnementet du
allerede betaler for, i skyen — maskinen din trenger ikke stå på. Det er samme
mekanisme som kjører denne sesjonen.

Den trenger to ting i miljøet: `SUPABASE_SERVICE_ROLE_KEY` (roboten skriver til
`submissions` utenom RLS) og en nettverkspolicy som slipper ut til
festivalnettstedene.

**Instruksen sjekkes inn i repoet**, som `.claude/skills/nattlig-oppdatering/SKILL.md`.
Da er prompten versjonert kode du kan rette, ikke et tekstfelt i et skjema du
har glemt innholdet i om tre måneder. Routinen sier bare «les den fila og gjør
det som står der».

**Alternativene, og hvorfor ikke:**

- *`claude -p` i lokal cron.* Virker, koster ingenting ekstra — men maskinen må
  stå på klokka to om natta. Fin som reserve.
- *GitHub Actions med Claude-action.* Kjører på API-kreditt, altså penger.
  Utelatt.
- *ChatGPT.* Ingen tilsvarende planlagt kjøring mot et repo og en database.
  Ville krevd API-nøkkel, altså penger.

---

## 7. Kvitteringen

Hver kjøring skal legge igjen spor, ellers vet du ikke om jobben virker eller
bare later som. To små kolonner på `festival_watch`:

```sql
alter table public.festival_watch
  add column if not exists ai_checked_at timestamptz,
  add column if not exists ai_note text;
```

`ai_note` er den viktige. Den skal svare på *hvorfor ingenting ble foreslått*:
«fant bare 2026-plakaten», «lineup ligger bak et Instagram-innlegg», «siden
krever JavaScript». Det er den listen som forteller deg hvilke 40 festivaler du
må ta for hånd uansett — og den skriver seg selv underveis.

Den har en rolle til, som neste punkt bygger på: `ai_note` er stedet roboten
har lov til å gi opp.

---

## 8. Tvil er ikke det samme som fjerning

Punkt 2 og 3 ruter på **operasjonstype**: `add` er trygt, `remove` er farlig.
Det er riktig, men det er ikke nok, for det sier ingenting om hvor sikker
roboten var. En usikker tilføyelse ser nøyaktig ut som en sikker.

Roboten må derfor kunne si «dette tror jeg, men se på det» — og den må kunne si
«jeg vet ikke, ikke spør meg». Tre utfall, ikke to:

**1. Sikker → rett inn.** Kun `add`. Navnene matcher `artist_names`. Siden sier
utvetydig 2027. Antall funnet er i nærheten av det man skulle vente.

**2. Usikker, men verdt et blikk → køen,** med begrunnelsen i `note`. Siden
sier «fredag» uten å si hvilken. Datoene ser ut som *save the date*. Ett navn
roboten ikke kjenner igjen og ikke klarer å avgjøre. Her er et menneske raskt
og roboten treg — det er nettopp det køen er til for.

**3. For usikker til å foreslå → ingen rad i det hele tatt.** Bare `ai_note`.

Punkt 3 er det som gjør ordningen bærekraftig, og det er det som er lettest å
glemme. Er roboten i tvil om siden overhodet viser 2027-plakaten, er riktig
handling å *ikke sende noe* — ikke å sende 60 navn med et spørsmålstegn. En kø
full av «kanskje?» er en kø du slutter å lese etter halvannen uke, og da er
hele ordningen død uansett hvor godt resten virker.

**Roboten skal altså ha lov til å gi opp**, og det å gi opp skal være synlig et
sted som ikke er morgenkøen din. Det stedet er `ai_note`, og du leser den når
du har tid.

### Hvordan sikkerheten avgjør ruten

`trust_level` er beskrevet i `plan-brukerbidrag.md`, men aldri bygget —
`src/lib/auth.ts` leser feltet, ingen handler på det. **Det er her det først
lønner seg**, og roboten er den perfekte første brukeren, fordi den er
forutsigbar på en måte mennesker ikke er.

Men regelen kan ikke være «tilføyelser går rett inn» alene, slik den er
formulert for mennesker. For roboten må begge være oppfylt:

> Automatisk innlegging krever at forslaget **kun inneholder `add`**, *og* at
> roboten selv har merket det som sikkert. Alt annet går i køen.

Det andre leddet trenger et sted å bo. `note` duger ikke — den er fritekst og
kan ikke rutes på. En liten kolonne gjør jobben:

```sql
alter table public.submissions
  add column if not exists confidence text
  check (confidence is null or confidence in ('high','low'));
```

`null` for mennesker, som før. For roboten er den obligatorisk, og bare `high`
er kandidat til automatikk. Da er «usikker» en tilstand databasen kjenner, ikke
en formulering i et notatfelt.

### Notatet må vises i listen

`note` vises på detaljsiden (`src/app/admin/[id]/page.tsx:213`), men **ikke i
listen** — `/admin` henter ikke feltet i det hele tatt.

For mennesker går det bra. En bidragsyter skriver sjelden noe avgjørende der.
For roboten er `note` hele grunnen til at raden ligger i køen, og uten den i
listen må du åpne hver enkelt for å finne ut hvorfor den kom. Ta feltet med i
selecten og vis det under `describe()`-linja.

Fem minutters jobb, men den avgjør om køen er lesbar når det ligger åtte
robotrader i den.

### Prøveperiode først

De to første ukene ser du alt, også det roboten kalte sikkert. Det er der du
finner ut om den leser fjorårets plakat, om den tar med sponsornavn, om den
gjetter datoer den ikke har — og, viktigst, om `high` og `low` betyr noe i
praksis eller om den merker alt `high`. Deretter skrus automatikken på.

---

## 9. Hva som står, og hva som gjenstår

**Bygget og prøvd** (`scripts/test_sql.sh` og `node --test scripts/robot-nightly.test.mjs`):

| | hva | hvor |
|---|---|---|
| ✓ | Robotidentitet, `confidence`, kravet om `source_url` | `20260825_robot_identity.sql` |
| ✓ | Vakten mot fjerning, flytting og nye festivaler | `guard_robot_submission` |
| ✓ | Reglene for den dagen fjerning åpnes | `robot_removal_problem` |
| ✓ | Nattens utvalg, `ai_checked_at` og `ai_note` | `20260825_ai_queue.sql` |
| ✓ | `note` og «usikker» i køvisningen | `src/app/admin/page.tsx` |
| ✓ | Hentingen, tekstbehandlingen og forslagsskrivingen | `scripts/robot-nightly.mjs` |
| ✓ | Instruksen roboten følger | `.claude/skills/nattlig-oppdatering/SKILL.md` |

**Gjenstår, med vilje:**

- **`trust_level = 1`** — tilføyelser rett inn. Skal ikke bygges før loggen
  viser at roboten fortjener det. Å bygge en vei utenom godkjenningen før man
  vet hvordan roboten faktisk oppfører seg, er å bygge nøyaktig den typen
  regel ingen vet om virker.
- **`remove` åpnes** — reglene står og er prøvd, sperren i
  `guard_robot_submission` er lukket. Å åpne er å endre én linje.

## 10. Slik settes det opp

**1. Kjør de to migrasjonene** i Supabase sin SQL-editor, i denne rekkefølgen:

```
supabase/migrations/20260825_robot_identity.sql
supabase/migrations/20260825_ai_queue.sql
```

**2. Opprett roboten.** Én gang, med tjenestenøkkelen i miljøet:

```bash
export SUPABASE_SERVICE_ROLE_KEY='...'
python3 scripts/create_robot.py
```

**3. Prøv den for hånd først**, på én festival, før noe settes på skinner:

```bash
node --env-file=.env.local scripts/robot-nightly.mjs pick --count 3
node --env-file=.env.local scripts/robot-nightly.mjs read <slug>
```

Se på det som kommer ut. Kjenner den igjen artistnavnene? Er `years_mentioned`
til å stole på? Det er her du finner ut om ordningen kommer til å virke, og det
koster ingenting å se etter.

**4. Sett opp Routinen** i Claude Code på nett — `claude.ai/code`, cron
`0 2 * * *`, ny sesjon per kjøring. Prompten skal bare være:

> Kjør den nattlige festivaloppdateringen. Følg
> `.claude/skills/nattlig-oppdatering/SKILL.md`.

Miljøet trenger `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, og en
**nettverkspolicy som slipper ut til festivalnettstedene**. Uten det siste får
roboten 403 på alt, og natta går med til ingenting.

**5. To ukers prøve.** Se på alt, også det roboten kalte sikkert. Det du ser
etter er ikke først og fremst feil navn — det er om `high` og `low` betyr noe i
praksis, eller om den merker alt `high`. Det er den mest sannsynlige måten
dette svikter stille på.

## 11. Det som ikke er prøvd

Testene dekker parsingen, reglene og utvalget. De dekker **ikke** en ekte
festivalside — miljøet testene ble skrevet i slipper ikke ut på nettet, så
prøvene er kjørt mot sidestrukturer bygget etter hukommelsen om hvordan slike
sider ser ut.

Det som gjenstår å finne ut, og som bare første natt kan svare på:

- Hvor mange av de 669 sidene er JavaScript-skall vi ikke kan lese?
- Ligger lineupen på forsiden, eller på en underside vakten ikke ser på?
- Hvor ofte står fjorårets plakat fortsatt oppe?

Svarene skriver seg selv inn i `ai_note`. Les den listen etter en uke — den er
mer verdt enn noen av gjetningene over.
