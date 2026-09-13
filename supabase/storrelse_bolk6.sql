-- Publikumstall, bolk 6 av 8 (rock/metal) -- 26 festivaler i Storbritannia og Sveits.
-- Hentet med nettsoek 2026-09-13. Alle 26 baandene stemmer med tallet sitt.
-- 13 funne tall, 4 kapasitet, 9 anslag.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Godiva Festival: 75 000 (2019) -- tall
--   en.wikipedia.org – tre dager, gratis fram til 2019; kapasitet 40 000 per dag
update festivals set size_band = '50000_100000' where slug = 'godiva-festival';

-- Green Man Festival: 25 000 -- kapasitet
--   en.wikipedia.org (kapasitet, Glanusk Estate, utsolgt)
update festivals set size_band = '10000_50000' where slug = 'green-man-festival';

-- Greenbelt Festival: 12 000 (2023) -- tall
--   en.wikipedia.org – 50-årsjubileum på Boughton House
update festivals set size_band = '10000_50000' where slug = 'greenbelt-festival';

-- GuilFest: 15 000 -- anslag
--   anslag – gikk konkurs i 2013 og ble gjenopplivet i mindre skala
update festivals set size_band = '10000_50000' where slug = 'guilfest';

-- Hampton Court Palace Festival: 30 000 -- anslag
--   anslag – ca. 3 000 per kveld i slottsgården over ti kvelder
update festivals set size_band = '10000_50000' where slug = 'hampton-court-palace-festival';

-- Lytham Festival: 120 000 (2025) -- tall
--   lythamfestival.com – 20 000 per kveld over fem dager
update festivals set size_band = 'over_100000' where slug = 'lytham-festival';

-- Meltdown: 20 000 -- anslag
--   anslag – kuratert serie på Southbank Centre, Royal Festival Hall tar 2 700
update festivals set size_band = '10000_50000' where slug = 'meltdown';

-- Monsters of Rock: 70 000 -- anslag
--   anslag – historiske tall fra Donington Park; festivalen er ikke arrangert regelmessig siden 2006
update festivals set size_band = '50000_100000' where slug = 'monsters-of-rock';

-- Strawberry Fair: 30 000 -- anslag
--   anslag – gratis endagsfestival på Midsummer Common i Cambridge
update festivals set size_band = '10000_50000' where slug = 'strawberry-fair';

-- The Big Feastival: 25 000 -- kapasitet
--   festivalcalendar.uk (kapasitet, Alex James' gård i Kingham)
update festivals set size_band = '10000_50000' where slug = 'the-big-feastival';

-- Tiree Music Festival: 2 300 -- kapasitet
--   tireemusicfestival.co.uk (kapasitet; tredobler øyas befolkning, alltid utsolgt)
update festivals set size_band = '2000_10000' where slug = 'tiree-music-festival';

-- Tramlines Festival: 90 000 -- kapasitet
--   festivalcalendar.uk (kapasitet 40 000 per dag i Hillsborough Park, tre dager)
update festivals set size_band = '50000_100000' where slug = 'tramlines-festival';

-- Balélec Festival: 15 000 (2025) -- tall
--   webradio.media – Europas største studentdrevne festival, EPFL-campus
update festivals set size_band = '10000_50000' where slug = 'balelec-festival';

-- Caribana Festival: 30 000 (2025) -- tall
--   rts.ch
update festivals set size_band = '10000_50000' where slug = 'caribana-festival';

-- Chant du Gros: 43 000 (2026) -- tall
--   rts.ch – tre kvelder; 45 000 i 2025
update festivals set size_band = '10000_50000' where slug = 'chant-du-gros';

-- Elements of Rock: 1 500 -- anslag
--   anslag – kristen metalfestival i Uster, klubbformat
update festivals set size_band = '200_2000' where slug = 'elements-of-rock';

-- Festi'neuch: 60 000 (2026) -- tall
--   rts.ch – 25-årsjubileum, fire dager ved Neuchâtelsjøen
update festivals set size_band = '50000_100000' where slug = 'festi-neuch';

-- Festival Baleinev: 4 000 -- anslag
--   anslag – liten festival i Yverdon-les-Bains
update festivals set size_band = '2000_10000' where slug = 'festival-baleinev';

-- Festival de la cité: 110 000 -- tall
--   swissinfo.ch – gratis, 200 forestillinger på 23 scener i Lausannes gamleby
update festivals set size_band = 'over_100000' where slug = 'festival-de-la-cite';

-- Festival du Gibloux: 4 000 -- anslag
--   anslag – landsbyfestival i Vuisternens-en-Ogoz
update festivals set size_band = '2000_10000' where slug = 'festival-du-gibloux';

-- Greenfield Festival: 80 000 (2023) -- tall
--   watson.ch – 75 000 i 2025, 84 000 i 2022 og 2023
update festivals set size_band = '50000_100000' where slug = 'greenfield-festival';

-- Les Francomanias: 5 000 -- anslag
--   anslag – frankofon festival i Bulle
update festivals set size_band = '2000_10000' where slug = 'les-francomanias';

-- Les Georges: 19 500 (2026) -- tall
--   rts.ch – seks kvelder på Place Georges-Python, tre av dem gratis
update festivals set size_band = '10000_50000' where slug = 'les-georges';

-- Open Air Val Lumnezia: 17 800 (2026) -- tall
--   nau.ch – utsolgt med 18 500 i 2025; taket er topografisk
update festivals set size_band = '10000_50000' where slug = 'open-air-val-lumnezia';

-- OpenAir St. Gallen: 105 000 (2026) -- tall
--   20min.ch – kapasitet 110 000 over fire dager
update festivals set size_band = 'over_100000' where slug = 'openair-st-gallen';

-- SummerDays Festival: 24 000 (2026) -- tall
--   stgallen24.ch – 12 000 per dag, utsolgt siden juli
update festivals set size_band = '10000_50000' where slug = 'summerdays-festival';

commit;

select name, size_band from festivals where slug in (
   'godiva-festival',
   'green-man-festival',
   'greenbelt-festival',
   'guilfest',
   'hampton-court-palace-festival',
   'lytham-festival',
   'meltdown',
   'monsters-of-rock',
   'strawberry-fair',
   'the-big-feastival',
   'tiree-music-festival',
   'tramlines-festival',
   'balelec-festival',
   'caribana-festival',
   'chant-du-gros',
   'elements-of-rock',
   'festi-neuch',
   'festival-baleinev',
   'festival-de-la-cite',
   'festival-du-gibloux',
   'greenfield-festival',
   'les-francomanias',
   'les-georges',
   'open-air-val-lumnezia',
   'openair-st-gallen',
   'summerdays-festival'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
