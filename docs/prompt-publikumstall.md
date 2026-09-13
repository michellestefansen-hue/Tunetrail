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

Da skal du anslå. Du skal alltid lande på et trinn — `ukjent` er ikke et gyldig
svar. En festival uten trinn faller ut av sorteringen på nettsiden og blir
usynlig, og det er verre enn et trinn som bommer med ett hakk.

Men anslaget skal være begrunnet, ikke gjettet. Bygg det på noe du faktisk fant:

- kapasiteten til spillestedet, parken eller hallen
- antall scener og antall dager
- hvor store navnene på plakaten er
- en sammenlignbar festival i samme by, sjanger og format som du fant tall for
- billettpris og hvor fort den ble utsolgt, hvis det står noe om det

Treffer du mellom to trinn, velg det laveste. Festivaler oppgir gjerne
optimistiske tall, og det er bedre å undervurdere.

Ikke oppgi kilder du ikke har åpnet. Ingen oppdiktede lenker. Et anslag skal
merkes som anslag — ikke pynt på det med en kilde som ikke sier det.

## Svarformat

Bare denne tabellen. Ingen innledning, ingen oppsummering etterpå.

| Festival | Sted | Tall | År | Kilde | size_band | grunnlag |
|---|---|---|---|---|---|---|

- **Festival**: navnet slik jeg skrev det, uendret. Ikke rett opp stavemåten,
  ikke oversett, ikke legg til årstall. Jeg kobler radene mot databasen på
  dette navnet, så en «rettet» stavemåte gjør at raden faller ut.
- **Sted**: by og land slik jeg skrev det.
- **Tall**: tallet du fant eller anslo, med tusenskille (130 000).
- **År**: året tallet gjelder for. Tom ved anslag uten årstall.
- **Kilde**: domenet, pluss «kapasitet» eller «flere helger» der det gjelder.
  Eksempel: `roskilde-festival.dk`, `wikipedia.org (kapasitet)`. Ved anslag:
  hva du bygde anslaget på, kort. Eksempel: `anslag – parkkapasitet 8 000`.
- **size_band**: én av de seks nøklene. Alltid utfylt.
- **grunnlag**: `tall` når du fant et faktisk besøkstall, `kapasitet` når du
  bare fant kapasitet, `anslag` når du resonnerte deg fram. Denne kolonnen er
  den viktigste for meg — den forteller hvilke rader som må sjekkes igjen
  senere, og jeg trenger å kunne stole på at den er ærlig.

Er du usikker på om to festivaler med liknende navn er den samme, ta med begge
og skriv det i kildekolonnen. Ikke slå dem sammen på eget initiativ.

## Festivalene

<lim inn listen her, én per linje som «Navn — By, Land»>
````

---

## Etterpå

Lim tabellen tilbake i chatten med meg. Jeg gjør den om til SQL, sjekker
tallene mot trinnene før noe skrives, og flagger radene der bandet ikke stemmer
med tallet — det er den vanligste feilen i slike svar.

Jeg teller også opp hvor mange rader som er `anslag`. Blir det en stor andel i
en bolk, er det som regel fordi festivalene i den bolken er små og lokale, og
da er anslagene sannsynligvis for høye heller enn for lave.

Navnene må stå urørt, ellers klarer jeg ikke koble radene mot databasen. Retter
ChatGPT opp en stavemåte, blir raden liggende.
