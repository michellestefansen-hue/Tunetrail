# Hvor nattjobben står

Skrevet 31. august 2026, som overlevering til neste sesjon.

Dette er ikke planen — den er `docs/plan-2027-oppdatering.md`, og den er
fortsatt riktig. Dette er hva som faktisk er bygget, hva som er prøvd mot ekte
nettsteder, og hva som gjenstår.

**Arbeidet ligger på branchen `claude/festival-2027-db-automation-dr4nw7`,
ikke på `main`.**

---

## Til deg som leser dette

Michelle er ikke utvikler. Hun eier prosjektet, kan databasen sin godt og har
bygget hele festivalregisteret for hånd — men hun skriver ikke kode, og
terminalen er ikke hjemmebane.

Det betyr tre ting:

- **Forklar hva noe gjør, ikke bare hva hun skal skrive.** «Kjør denne» uten
  «fordi» er ubrukelig når noe går galt.
- **Aldri plassholdere i kommandoer.** `read <slug>` ble limt inn ordrett og
  ga en feilmelding. Skriv den ferdige kommandoen.
- **Si `git pull` hver eneste gang** du har endret noe. Den forrige sesjonen
  kjørte i skyen, og filer «manglet» tre ganger fordi de lå upullet.

Det siste gjelder ikke lenger hvis du kjører lokalt i VS Code — da har du
filene selv. Sjekk hvor du er før du gir råd om det.

---

## Hva som virker, og hvordan vi vet det

Alt under er kjørt mot ekte nettsteder 31. august 2026, ikke bare mot tester.

| | prøvd | resultat |
|---|---|---|
| Henting og tekstuttrekk | Roskilde, Reverze | ren, lesbar tekst |
| Artistmatching mot `artist_names` | Roskildes programside | **176 av ~185 gjenkjent** |
| Å finne programsiden fra forsiden | Roskilde | `/program` funnet |
| Å kjenne igjen fjorårets plakat | Roskildes programside | **97 % overlapp med 2026 — fanget** |
| Å finne datoen | Reverze | `26 + 27 February 2027` funnet |
| Å skrive et forslag i køen | Reverze | `submission_id` returnert |

Databasen har tre migrasjoner kjørt i produksjon: `20260825_robot_identity`,
`20260825_ai_queue`, `20260831_ai_queue_order`. Robotprofilen finnes
(`profiles.is_robot`).

**Testene:** `node --test scripts/robot-nightly.test.mjs` (52) og
`scripts/test_sql.sh` (kjører migrasjonene mot en engangs-PostgreSQL). Begge
er verifisert til å feile når de skal, ved sabotasje.

---

## Fem feller, alle funnet på ekte sider

Disse er rettet. De står her fordi de sier noe om hva slags feil dette
prosjektet får, og fordi neste feil trolig ligner.

**Forsiden er ikke programsiden.** Vaktlisten ble fylt fra
`festivals.website_url`. Roskildes forside har datoene, men ikke ett
artistnavn. `read` returnerer nå `lineup_links`, og `watch-url <slug> <adresse>`
lagrer undersiden når den er funnet. *Det er den kommandoen som sparer mest
over tid, og den er lett å glemme.*

**Fjorårets plakat står oppe i månedsvis.** Roskildes programside sa
«26/6 – 3/7 2027» øverst og hadde fjorårets 174 artister under. Å telle
årstall svarte feil. `edition_match` teller i stedet hvor mye av det lagrede
programmet som står på siden — 97 % overlapp med 2026 er ikke en tolkning.

**Fete Unicode-tegn.** Reverze skrev «𝟮𝟲 + 𝟮𝟳 FEBRUARY 𝟮𝟬𝟮𝟳». Ikke ASCII.
`\b2027\b` fant ingenting. NFKC i `toText` retter det. Vi fant det bare fordi
datoen sto to steder på siden — ellers hadde vi trodd alt virket.

**Nedtrekkslister.** Et nyhetsbrevskjema ga 250 landnavn som kandidater.
`<select>` strippes nå som `script` og `style`.

**Bylines ser ut som artistnavn.** «Peter Troest», «Mick Friis» — journalister
på Roskildes forside. Ingen kodefiks; det står som en advarsel i SKILL-fila.

---

## Neste steg, i rekkefølge

**1. Godkjenn Reverze i `/admin`.** Forslaget ligger der. Dette er den siste
delen av kjeden som aldri er prøvd: at godkjenning faktisk oppretter
2027-utgaven. Gjør dette først.

**2. Kjør ti festivaler for hånd.** Ikke sett opp nattkjøringen ennå. Følg
`.claude/skills/nattlig-oppdatering/SKILL.md` selv, på ti stykker fra
`pick`, og se hva som skjer. Det er der du finner ut hvor mange sider som er
JavaScript-skall, hvor ofte lineupen ligger på en underside, og om `--kort`
viser det den bør.

**3. Så nattkjøringen.** Punkt 10 i planen. Trenger en nettverkspolicy som
slipper ut til festivalnettstedene — uten den blir alt 403.

**Ikke rør ennå:** `trust_level = 1` (tilføyelser rett inn) og
`robot_may_remove` i `guard_robot_submission`. Begge er bevisst holdt igjen
til loggen viser at roboten fortjener det. Se punkt 8 og 9 i planen.

---

## Kommandoene

```bash
# Hvem skal ses på i natt
node --env-file=.env.local scripts/robot-nightly.mjs pick --count 5

# Les en side. --kort for øyne, uten for en modell.
node --env-file=.env.local scripts/robot-nightly.mjs read reverze --kort

# Lineupen lå på en underside: les den, og lagre adressen
node --env-file=.env.local scripts/robot-nightly.mjs read roskilde-festival --url https://www.roskilde-festival.dk/program
node --env-file=.env.local scripts/robot-nightly.mjs watch-url roskilde-festival https://www.roskilde-festival.dk/program

# Send et forslag, eller si at det ikke ble noe
node --env-file=.env.local scripts/robot-nightly.mjs propose forslag/reverze.json
node --env-file=.env.local scripts/robot-nightly.mjs note reverze "ingen 2027-lineup publisert"
```

Forslagsfiler hører hjemme i `forslag/` — den er i `.gitignore`.

---

## Det ingen vet ennå

Ett spørsmål avgjør om ordningen er verdt å drive: **hvor stor andel av de 669
nettstedene er lesbare i det hele tatt?** To sider er prøvd. Begge var lesbare.
Det er ikke et grunnlag.

Svaret skriver seg selv inn i `festival_watch.ai_note` etter hvert som roboten
gir opp på dem den ikke får til. Les den kolonnen etter den første uka. Er den
full av «krever JavaScript», er det ordningens virkelige tak — og da er det
bedre å vite det tidlig enn å bygge videre på en antakelse.
