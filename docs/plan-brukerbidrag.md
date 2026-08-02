# Brukerbidrag: redigering og program

Alle skal kunne foreslå endringer på alle festivaler. Ingenting går live før
det er godkjent manuelt. Program er den viktigste delen, fordi det er det som
endrer seg oftest.

---

## 0. Sikkerhetshullet som må tettes først

**Hvem som helst kan i dag endre eller slette hele databasen.**

Den offentlige nøkkelen ligger i nettleserbundelen — den må ligge der for at
kartet skal virke — og en `PATCH` mot både `festivals` og `festival_editions`
med den nøkkelen svarer `HTTP 200`. Radnivåsikkerhet er altså av, eller står
åpen for skriving. Testen ble kjørt mot en rad som ikke finnes, så ingenting
ble endret, men serveren bekreftet at operasjonen er tillatt.

Dette må tettes uavhengig av resten av planen, og det er samtidig fundamentet
for alt under: når skriving først må gå gjennom serveren, blir «forslag som
godkjennes» en naturlig konsekvens i stedet for et påheng.

```sql
alter table festivals            enable row level security;
alter table festival_editions    enable row level security;

create policy "les for alle" on festivals
  for select using (true);
create policy "les for alle" on festival_editions
  for select using (true);
```

Ingen `insert`/`update`/`delete`-policy for `anon`. All skriving skjer
serverside med service-nøkkelen, som allerede finnes i `api/enrich`.

**Verifiser etterpå** at den samme `PATCH`-en nå svarer 401 eller 403, og at
kartet fortsatt laster.

---

## 1. Datamodell

### `profiles`
Kobler Supabase-brukeren til det vi trenger å vite om vedkommende.

| felt | type | merknad |
|---|---|---|
| `id` | uuid | = `auth.users.id` |
| `display_name` | text | vises som «foreslått av» |
| `is_admin` | boolean | bare deg, i praksis |
| `trust_level` | int | 0 = ny, 1 = betrodd. Brukes først for program |
| `created_at` | timestamptz | |

### `submissions`
Ett forslag = én rad. Dekker både redigering, ny festival og program.

| felt | type | merknad |
|---|---|---|
| `id` | uuid | |
| `kind` | text | `festival_edit` · `festival_new` · `program_edit` |
| `festival_id` | uuid null | null for `festival_new` |
| `edition_year` | int null | kun for `program_edit` |
| `payload` | jsonb | se under — ulik form per `kind` |
| `base_snapshot` | jsonb | hvordan feltene så ut da forslaget ble sendt |
| `source_url` | text | «hvor har du dette fra?» |
| `note` | text | fritekst fra bidragsyter |
| `status` | text | `pending` · `applied` · `rejected` · `partial` |
| `submitted_by` | uuid | → `profiles` |
| `reviewed_by` | uuid null | |
| `review_note` | text | begrunnelse ved avvisning |
| `created_at` / `reviewed_at` | timestamptz | |

### `submission_audit`
Hva som faktisk ble tatt inn. Gjør det mulig å svare på «hvem endret dette,
og når» — og å rulle tilbake.

| felt | type |
|---|---|
| `id`, `submission_id`, `festival_id` | uuid |
| `field` | text (`venue_name`, `program:2027` …) |
| `old_value` / `new_value` | jsonb |
| `applied_at` | timestamptz |

### `payload`-former

**`festival_edit`** — kun de endrede feltene:
```json
{ "venue_name": "Tøyenparken", "website_url": "https://…" }
```

**`festival_new`** — hele raden, uten `slug` (den lages ved godkjenning).

**`program_edit`** — *operasjoner*, ikke et nytt program. Dette er nøkkelen,
se neste avsnitt.
```json
{ "add":    [{ "date": "2027-06-26", "name": "Wet Leg" }],
  "remove": [{ "date": "2027-06-27", "name": "TBA" }],
  "move":   [{ "from": "2027-06-26", "to": "2027-06-28", "name": "CMAT" }] }
```

---

## 2. Program: operasjoner, ikke erstatning

Et program er i praksis et sett med par av dato og artistnavn. Behandler vi
det slik, faller tre problemer bort samtidig.

**Erstatning ødelegger.** 2. august 2026 ble Time in Jazz slått tilbake fra
9 dager og 44 artister til 5 og 12, fordi en eldre fil ble kjørt oppå en
nyere. Lagrer vi «legg til disse navnene» i stedet for «her er hele
programmet», kan to personer bidra samme dag uten å overskrive hverandre.

**Diffen blir lesbar.** En innsending vises som tre lister — lagt til,
fjernet, flyttet. En typisk melding er «+12, −0», og da trenger du ikke lese
gjennom 200 navn. Fjerninger er det eneste som krever ettertanke, og de er
sjeldne.

**Delvis godkjenning blir mulig.** Hake per artist, ikke per innsending.

### Inndata: lim inn, ikke fyll ut

Ingen fyller ut et skjema med 200 rader. Bidragsyteren velger festival og år,
ser dagens line-up gruppert per dag, og kan lime inn en bunke navn under en
dag. Parseren er den samme som er brukt manuelt gjennom hele
databasearbeidet: én dato, så ett navn per linje.

### Rensing ved døra

Alt dette er ryddet opp i etterkant én gang allerede. Det bør ikke skje igjen:

- **Klokkeslett strippes** fra navnet. `20:30 Melody Gardot` → `Melody Gardot`.
  235 slike lå i basen og gjorde artistene usøkbare.
- **STORE BOKSTAVER flagges**, men rettes ikke automatisk. `BABYMETAL` og
  `CMAT` skal være slik. Regelen som virket: rett kun når samme navn finnes i
  normal skrivemåte et annet sted i basen.
- **Scene og klokkeslett avvises** som egne felt. `stage` og `time` skal alltid
  være `null`.
- **Nesten-duplikater innen samme dag** fanges før innsending: `The Sonics`
  mot `the sonics`.
- **Datoer utenfor festivalens periode** avvises med forklaring. 16 slike dager
  ligger i basen i dag og vises ikke i appen — Zürich Openair har tre dager med
  42 artister som er usynlige av den grunn.

### Tillitsnivå hører hjemme her først

For alt annet er tillitsnivåer noe man venter med. For program er det det som
gjør ordningen bærekraftig, fordi volumet er høyt og tilføyelser er ufarlige:

- `trust_level = 0`: alt til kø.
- `trust_level = 1`: **tilføyelser går rett inn**, fjerninger og flyttinger til kø.

Du hever nivået manuelt når noen har levert et par gode bidrag.

### «Dette er utdatert»-knapp

Program råtner stille. En ett-klikks melding — uten skjema — som legger
festivalen i køen din som et hint, ikke et forslag. Billig å bygge, og den
fanger det ingen gidder å skrive et helt bidrag om.

---

## 3. Konflikt: forslaget som ble gammelt

Noen foreslår en endring mandag. Du godkjenner fredag. I mellomtiden har du
selv rettet det samme feltet. Uten vern overskriver godkjenningen din egen
rettelse i stillhet.

Derfor lagres `base_snapshot`. Ved godkjenning sammenlignes dagens verdi med
snapshotet. Er den endret, sier køen fra og viser begge, i stedet for å
skrive over.

For program gjelder det samme, men mildere: en tilføyelse av et navn som
allerede finnes blir bare ignorert, og en fjerning av et navn som er borte er
et ikke-problem.

---

## 4. Hva folk får røre

| felt | tilgang | hvorfor |
|---|---|---|
| beskrivelse, arena, nettsted, bilde, tagger | fritt | verste utfall er at det ser rart ut |
| program | fritt, som operasjoner | endrer seg mest, se over |
| datoer, koordinater | tillatt, men merket i køen | feil dato skjuler festivalen, feil koordinat flytter den til feil land |
| navn | tillatt, merket | påvirker søk |
| `slug` | **aldri** | det er URL-en; endring brekker lenker og søketreff |

---

## 5. Ny festival

Oppfører seg annerledes enn redigering. Det farligste er ikke feil felt, men
**duplikater** — fem er funnet i databasen, og fire av dem oppsto fordi
navnematching krevde eksakt likhet, slik at «Pstereo» gled forbi «Pstereo
Festival».

Skjemaet må derfor sjekke mens folk skriver: finnes det en festival innen
10 km med lignende navn eller overlappende datoer? Vis den, og spør om det er
den de mente. Det stopper de fleste duplikatene før de blir din jobb.

`slug` lages ved godkjenning, ikke av bidragsyteren.

---

## 6. Arbeidsflyt

**Inn.** Skjema inne i appen, ikke Nettskjema eller Google Forms. Et eksternt
skjema kan verken vise hva som står der fra før eller binde svaret til riktig
festival — og da sitter du med «Pstereo» i et regneark og må gjette hvilken
rad det gjelder.

**Innlogging.** E-postlenke, ingen passord. Supabase har det innebygd, og
`@supabase/ssr` er allerede koblet opp med cookies i `src/lib/supabase/`.
Terskelen er lav nok til at folk gidder, men du får en identitet å knytte
bidraget til.

**Til deg.** Kø på `/admin`, med e-postvarsel når noe lander. Ikke godkjenn
via lenke i e-posten — den kan videresendes, og da godkjenner hvem som helst.

**Køen, felt for felt.** Gammelt mot nytt, med hake per felt. Ikke godkjenn
eller avvis alt under ett: noen fikser arenanavnet riktig og roter til taggene
i samme slengen. Uten dette avviser du gode bidrag på grunn av én feil, og
folk slutter å bidra.

**Ut i systemet.** Én Postgres-funksjon, kalt via RPC, som skriver endringen
og revisjonsloggen i samme transaksjon. Enten går alt gjennom, eller
ingenting.

---

## 7. Filer

### Nye
- `supabase/migrations/*_rls_lockdown.sql` — steg 0.
- `supabase/migrations/*_submissions.sql` — tabellene over, med RLS:
  bidragsyter kan sette inn og lese egne rader, kun admin kan endre `status`.
- `supabase/migrations/*_apply_submission.sql` — funksjonen som anvender et
  godkjent forslag, felt for felt eller operasjon for operasjon.
- `src/lib/submissions.ts` — typer, diff-beregning, program-parser og
  navnerensing. Parseren og rensereglene finnes allerede som engangsskript og
  bør flyttes hit.
- `src/app/[locale]/festival/[slug]/foresla/page.tsx` — skjema for redigering.
- `src/app/[locale]/festival/[slug]/program/foresla/page.tsx` — lim-inn-flyt.
- `src/app/[locale]/ny-festival/page.tsx` — med duplikatvarsling.
- `src/app/admin/page.tsx` — køen. Ikke lokalisert; bare du bruker den.
- `src/app/admin/[id]/page.tsx` — gjennomgang med hake per felt.
- `src/components/DiffRow.tsx`, `ProgramDiff.tsx` — visningen.

### Endres
- `src/lib/supabase/server.ts` — hente innlogget bruker.
- `middleware.ts` — fornye sesjon, sperre `/admin` for andre enn admin.
- `src/app/[locale]/festival/[slug]/page.tsx` — «Foreslå endring»-knapp.
- `messages/*.json` — skjematekster på fem språk. Adminkøen kan stå på norsk.

---

## 8. Rekkefølge

1. **Lås basen.** Publikum leser, serveren skriver. Gjøres nå, uavhengig av
   resten.
2. **Innlogging med e-postlenke** og `profiles` med `is_admin`.
3. **Redigering av trygge felt** med kø og hake per felt. Liten flate, beviser
   at flyten virker.
4. **Program.** Det egentlige målet: lim-inn, operasjoner, tre-listers diff,
   rensing ved døra.
5. **Tillitsnivå 1 for program**, når du ser hva folk faktisk sender inn.
6. **Ny festival** med duplikatvarsling.
7. Datoer og koordinater, tilbakerulling fra revisjonsloggen.

Steg 1 til 4 er kjernen. Resten er påbygg.

---

## 9. Verifisering

1. Uinnlogget `PATCH` mot `festivals` med den offentlige nøkkelen svarer 401
   eller 403. Kartet laster fortsatt.
2. Bidragsyter A kan ikke lese bidragsyter B sine forslag.
3. Ikke-admin får 404 på `/admin`.
4. Et forslag endrer ingenting i `festivals` før det godkjennes.
5. Delvis godkjenning: to felt inn, ett avvist — kun det ene er skrevet, og
   `status` blir `partial`.
6. Konflikt: endre feltet i basen etter innsending, og bekreft at køen varsler
   i stedet for å overskrive.
7. Program: to bidragsytere legger til hver sine navn på samme dag. Begge
   overlever.
8. Program: `20:30 Melody Gardot` limes inn og lagres som `Melody Gardot`, med
   `stage` og `time` lik `null`.
9. Program: en dato utenfor festivalens periode avvises med forklaring.
10. Revisjonsloggen viser gammel og ny verdi for hver anvendt endring.
