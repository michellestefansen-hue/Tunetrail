-- Publikumstall, bolk 3 av 8 (rock/metal) -- 27 festivaler i Frankrike,
-- Irland, Italia, Kroatia og Nederland.
-- Hentet med nettsoek 2026-09-13. Alle 27 baandene stemmer med tallet sitt.
-- 19 funne tall, 1 kapasitet, 7 begrunnede anslag.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Rolling Saône: 9 000 -- anslag
--   anslag – Halle Sauzay tar 4 500, tre dager, sjelden fullt alle kvelder; hautesaonetourisme.com
update festivals set size_band = '2000_10000' where slug = 'rolling-saone';

-- Sylak Open Air: 10 000 (2026) -- tall
--   fr.wikipedia.org – ca. 3 500 per dag i tre dager
update festivals set size_band = '10000_50000' where slug = 'sylak-open-air';

-- V&B Fest: 160 000 (2025) -- tall
--   fr.wikipedia.org – hvorav 135 000 betalende
update festivals set size_band = 'over_100000' where slug = 'v-og-b-fest';

-- crossover festival: 5 000 -- anslag
--   anslag – ni dager fordelt på Le 109, Stockfish, Théâtre de Verdure m.fl.; explorenicecotedazur.com
update festivals set size_band = '2000_10000' where slug = 'crossover-festival';

-- Live at the Marquee (festival): 60 000 -- anslag
--   anslag – 5 000 per kveld i telt, konsertrekke over flere uker; nialler9.com (kapasitet)
update festivals set size_band = '50000_100000' where slug = 'live-at-the-marquee-festival';

-- AMA Music Festival: 57 000 (2025) -- tall
--   ilnordest.it
update festivals set size_band = '50000_100000' where slug = 'ama-music-festival';

-- Alpen Flair: 40 000 (2025) -- tall
--   unsertirol24.com
update festivals set size_band = '10000_50000' where slug = 'alpen-flair';

-- Concerto del Primo Maggio: 250 000 (2026) -- tall
--   radioroma.it – Piazza San Giovanni, gratis
update festivals set size_band = 'over_100000' where slug = 'concerto-del-primo-maggio';

-- Ferrara Buskers Festival: 700 000 -- tall
--   artbonus.gov.it – gategjøglerfestival i hele byen, gratis
update festivals set size_band = 'over_100000' where slug = 'ferrara-buskers-festival';

-- Laos Fest - Festival di Musica in Calabria: 6 000 (2026) -- tall
--   lacnews24.it – 10. utgave, gratis, tre kommuner
update festivals set size_band = '2000_10000' where slug = 'laos-fest-festival-di-musica-in-calabria';

-- MoonJune Festival: 3 000 -- anslag
--   anslag – 18 konserter på fem scener i Teramo over fire dager; moonjunefest.com
update festivals set size_band = '2000_10000' where slug = 'moonjune-festival';

-- Poplar Festival: 18 000 (2025) -- tall
--   ladige.it
update festivals set size_band = '10000_50000' where slug = 'poplar-festival';

-- Steinegg Live: 5 000 -- anslag
--   anslag – konsertrekke i en sørtyrolsk landsby, ingen tall publisert; de.wikipedia.org
update festivals set size_band = '2000_10000' where slug = 'steinegg-live';

-- Ypsigrock Festival: 10 000 (2025) -- tall
--   tg24.sky.it – 28. utgave, bevisst holdt liten
update festivals set size_band = '10000_50000' where slug = 'ypsigrock';

-- Hoomstock: 1 500 (2017) -- tall
--   muzika.hr – humanitær rockefestival, én dag
update festivals set size_band = '200_2000' where slug = 'hoomstock';

-- Mudri Brk Festival: 1 000 -- anslag
--   anslag – fem dager på småscener i Jelsa på Hvar, dagspass 15 euro; ziher.hr omtaler den som «mali festival»
update festivals set size_band = '200_2000' where slug = 'mudri-brk-festival';

-- Pannonian Challenge: 30 000 -- anslag
--   anslag – største ekstremsport- og musikkfestival i Sørøst-Europa, sendes på Eurosport; osijek.hr
update festivals set size_band = '10000_50000' where slug = 'pannonian-challenge';

-- Appelpop: 100 000 (2025) -- tall
--   hetkontakt.nl – gratis, historisk opp mot 150 000
update festivals set size_band = 'over_100000' where slug = 'appelpop';

-- Baroeg Open Air: 8 500 (2025) -- tall
--   dehavenloods.nl – gratis, 10 000 i 2024
update festivals set size_band = '2000_10000' where slug = 'baroeg-open-air';

-- Best Kept Secret: 45 000 -- tall
--   en.wikipedia.org – 15 000 per dag i tre dager
update festivals set size_band = '10000_50000' where slug = 'best-kept-secret';

-- Bospop: 35 000 (2025) -- tall
--   l1nieuws.nl
update festivals set size_band = '10000_50000' where slug = 'bospop';

-- Castlefest: 55 000 (2025) -- tall
--   lissernieuws.nl – utsolgt
update festivals set size_band = '50000_100000' where slug = 'castlefest';

-- Dynamo Metalfest: 10 000 -- tall
--   nl.wikipedia.org – tre dager, kapasitetstak 10 000
update festivals set size_band = '10000_50000' where slug = 'dynamo-metalfest';

-- Eurosonic Noorderslag: 44 000 -- tall
--   gic.nl
update festivals set size_band = '10000_50000' where slug = 'eurosonic-noorderslag';

-- Huntenpop: 25 000 -- tall
--   nl.wikipedia.org – rekord 26 000 i 2017
update festivals set size_band = '10000_50000' where slug = 'huntenpop';

-- Into The Grave: 7 000 -- kapasitet
--   nl.wikipedia.org (kapasitet, maks 7 000)
update festivals set size_band = '2000_10000' where slug = 'into-the-grave';

-- Into The Great Wide Open: 6 000 -- tall
--   rederij-doeksen.nl – alltid utsolgt, begrenset av at det er på Vlieland
update festivals set size_band = '2000_10000' where slug = 'into-the-great-wide-open';

commit;

select name, size_band from festivals where slug in (
   'rolling-saone',
   'sylak-open-air',
   'v-og-b-fest',
   'crossover-festival',
   'live-at-the-marquee-festival',
   'ama-music-festival',
   'alpen-flair',
   'concerto-del-primo-maggio',
   'ferrara-buskers-festival',
   'laos-fest-festival-di-musica-in-calabria',
   'moonjune-festival',
   'poplar-festival',
   'steinegg-live',
   'ypsigrock',
   'hoomstock',
   'mudri-brk-festival',
   'pannonian-challenge',
   'appelpop',
   'baroeg-open-air',
   'best-kept-secret',
   'bospop',
   'castlefest',
   'dynamo-metalfest',
   'eurosonic-noorderslag',
   'huntenpop',
   'into-the-grave',
   'into-the-great-wide-open'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
