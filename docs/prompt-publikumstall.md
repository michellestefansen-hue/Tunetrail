# Prompt: finn publikumstall for festivaler

Til bruk i ChatGPT for å fylle inn `festivals.size_band`. **Slå på nettsøk** —
publikumstall må hentes fra kilder, ikke fra modellens hukommelse.

Lim inn prompten under, og legg festivalnavnene nederst. **25–40 festivaler per
melding.** Flere enn det gir kortere og slappere svar, og det er nettopp
kildesjekken som blir droppet først.

Svaret kommer som en tabell jeg kan gjøre om til SQL direkte.

---

## Prompten

````
Du skal finne publikumstall for musikkfestivaler i Europa og plassere hver av
dem i et størrelsestrinn. Bruk nettsøk. Ikke svar fra hukommelsen.

## Hva som menes med publikumstall

Antall publikummere for ÉN utgave av festivalen, alle dager lagt sammen. Dette
er viktig, for tallene som finnes på nettet blandes ofte sammen:

- Bruk totalt besøkstall for hele festivalen, slik arrangøren eller pressen
  oppgir det. Roskilde 2024 = ca. 130 000.
- IKKE bruk dagskapasitet der totaltallet finnes. En festival med 30 000 per
  dag i fire dager skal ikke føres som 30 000.
- Går festivalen over flere helger (Tomorrowland), bruk summen for hele
  arrangementet, og skriv i kildekolonnen at det er flere helger.
- Finnes bare kapasitet og ikke faktisk besøk, bruk kapasiteten og skriv
  «kapasitet» i kildekolonnen.
- Bruk nyeste år du finner tall for. Hopp over avlyste utgaver.

Skriv alltid hvilket år tallet gjelder, og hva slags tall det er. Jeg må kunne
etterprøve trinnet uten å slå det opp selv.

## Trinnene

Bruk nøyaktig disse nøklene, skrevet slik de står:

| nøkkel         | betyr                     |
|----------------|---------------------------|
| under_200      | under 200 publikummere    |
| 200_2000       | 200 – 2 000               |
| 2000_10000     | 2 000 – 10 000            |
| 10000_50000    | 10 000 – 50 000           |
| 50000_100000   | 50 000 – 100 000          |
| over_100000    | over 100 000              |

Grensene er inkluderende nedad: 2 000 hører til 2000_10000, ikke til 200_2000.

## Når du ikke finner tall

Skriv `ukjent` i nøkkelkolonnen og la tall-, år- og kildekolonnen stå tom.

Dette er viktigere enn å fylle ut tabellen. Et gjettet tall er verre enn et
tomt felt, fordi ingen kommer til å kontrollere det etterpå. Finner du bare en
løs omtale som «tusenvis av besøkende», er det ikke nok — skriv `ukjent`.

Ikke oppgi kilder du ikke har åpnet. Ingen oppdiktede lenker.

## Svarformat

Bare denne tabellen. Ingen innledning, ingen oppsummering etterpå.

| Festival | Land | Tall | År | Kilde | size_band |
|---|---|---|---|---|---|

- **Festival**: navnet slik jeg skrev det, uendret. Ikke rett opp stavemåten,
  ikke oversett, ikke legg til årstall. Jeg kobler radene mot databasen på
  dette navnet.
- **Land**: slik jeg skrev det.
- **Tall**: tallet du fant, med tusenskille (130 000). Tom ved `ukjent`.
- **År**: året tallet gjelder for. Tom ved `ukjent`.
- **Kilde**: domenet, pluss «kapasitet» eller «flere helger» der det gjelder.
  Eksempel: `roskilde-festival.dk`, `wikipedia.org (kapasitet)`.
- **size_band**: én av de seks nøklene, eller `ukjent`.

Er du usikker på om to festivaler med liknende navn er den samme, ta med begge
og skriv det i kildekolonnen. Ikke slå dem sammen på eget initiativ.

## Festivalene

<lim inn listen her, én per linje som «Navn — Land»>
````

---

## Etterpå

Lim tabellen tilbake i chatten med meg. Jeg gjør den om til SQL, sjekker
tallene mot trinnene før noe skrives, og flagger radene der bandet ikke stemmer
med tallet — det er den vanligste feilen i slike svar.

Navnene må stå urørt, ellers klarer jeg ikke koble radene mot databasen. Retter
ChatGPT opp en stavemåte, blir raden liggende.
