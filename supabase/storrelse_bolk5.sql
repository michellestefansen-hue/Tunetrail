-- Publikumstall, bolk 5 av 8 (rock/metal) -- 26 festivaler i Portugal,
-- Romania, Slovakia, Slovenia, Spania og Storbritannia.
-- Hentet med nettsoek 2026-09-13. Alle 26 baandene stemmer med tallet sitt.
-- 16 funne tall, 3 kapasitet, 7 begrunnede anslag.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- SonicBlast Fest: 12 000 -- tall
--   musicfestivalwizard.com – tak rundt 10 000, rekord 15 000 i 2022
update festivals set size_band = '10000_50000' where slug = 'sonicblast-fest';

-- Vagos Metal Fest: 38 000 (2025) -- tall
--   theportugalpost.com
update festivals set size_band = '10000_50000' where slug = 'vagos-metal-fest';

-- Bálványos Summer Open University and Student Camp: 30 000 -- tall
--   hu.wikipedia.org – 16 000 daglig, 5 000 bor på campen
update festivals set size_band = '10000_50000' where slug = 'balvanyos-summer-open-university-and-student-camp';

-- Electric Castle: 289 000 (2025) -- tall
--   stirileprotv.ro – fem dager, rekord
update festivals set size_band = 'over_100000' where slug = 'electric-castle';

-- LaRock Music Festival: 3 000 -- anslag
--   anslag – liten rumensk festival, 2026-utgaven avlyst
update festivals set size_band = '2000_10000' where slug = 'larock-music-festival';

-- Rockstadt Extreme Fest: 20 000 (2026) -- tall
--   monitorulexpres.ro – arrangøren begrenset salget til ca. 20 000 pass
update festivals set size_band = '10000_50000' where slug = 'rockstadt-extreme-fest';

-- Grape Festival: 25 000 (2026) -- tall
--   teraz.sk – kapasitet 30 000, rekord 29 000 i 2019
update festivals set size_band = '10000_50000' where slug = 'grape-festival';

-- Tolminator: 3 000 (2025) -- tall
--   tolminator.com – tak på 5 000, under 3 000 i 2025
update festivals set size_band = '2000_10000' where slug = 'tolminator';

-- Ebrovisión: 24 000 (2026) -- tall
--   burgosnoticias.com – fire dager, publikumsrekord
update festivals set size_band = '10000_50000' where slug = 'ebrovision';

-- Embassa't: 3 000 -- anslag
--   anslag – gratis byfestival i Sabadell
update festivals set size_band = '2000_10000' where slug = 'embassa-t';

-- Festival Noches del Botánico: 190 000 (2026) -- tall
--   infobae.com – 52 konserter fra juni til juli i Real Jardín Botánico
update festivals set size_band = 'over_100000' where slug = 'festival-noches-del-botanico';

-- Festival de la Luz: 5 000 -- anslag
--   anslag – endagsfestival i Boimorto i Galicia
update festivals set size_band = '2000_10000' where slug = 'festival-de-la-luz';

-- Granada Sound: 25 000 -- tall
--   granadadigital.es – to dager på Cortijo del Conde
update festivals set size_band = '10000_50000' where slug = 'granada-sound';

-- Leyendas del Rock: 60 000 (2026) -- tall
--   intercomarcal.com – 20-årsjubileum, fire dager
update festivals set size_band = '50000_100000' where slug = 'leyendas-del-rock';

-- Mad Cool Festival: 180 000 (2025) -- tall
--   dondego.es – over 50 000 daglig
update festivals set size_band = 'over_100000' where slug = 'mad-cool-festival';

-- Monkey Week: 2 500 -- tall
--   canalsur.es – showcase-festival, over 90 konserter
update festivals set size_band = '2000_10000' where slug = 'monkey-week';

-- Paupaterres: 5 000 -- anslag
--   anslag – katalansk byfestival i Tàrrega
update festivals set size_band = '2000_10000' where slug = 'paupaterres';

-- Portalblau: 5 000 -- anslag
--   anslag – åtte dager på flere scener i L'Escala
update festivals set size_band = '2000_10000' where slug = 'portalblau';

-- Rock Imperium Festival: 50 000 (2026) -- tall
--   cartagena.es – tre dager, publikum fra 40 land
update festivals set size_band = '50000_100000' where slug = 'rock-imperium-festival';

-- Sonorama Ribera: 200 000 (2025) -- tall
--   diariodecastillayleon.es – ca. 40 000 daglig
update festivals set size_band = 'over_100000' where slug = 'sonorama';

-- Sun & Thunder Festival: 3 000 -- anslag
--   anslag – ny metalfestival i Fuengirola, ingen tall publisert
update festivals set size_band = '2000_10000' where slug = 'sun-and-thunder-festival';

-- All Points East: 240 000 -- kapasitet
--   allpointseastfestival.com (kapasitet 40 000 per dag på seks billetterte dager i Victoria Park)
update festivals set size_band = 'over_100000' where slug = 'all-points-east';

-- Bestival: 50 000 (2018) -- tall
--   en.wikipedia.org – siste utgave; selskapet gikk konkurs høsten 2018
update festivals set size_band = '50000_100000' where slug = 'bestival';

-- Bloodstock Open Air: 20 000 -- kapasitet
--   en.wikipedia.org (kapasitet, Catton Hall)
update festivals set size_band = '10000_50000' where slug = 'bloodstock-open-air';

-- British Summer Time Hyde Park: 400 000 -- kapasitet
--   en.wikipedia.org (kapasitet, 65 000 per dag; lisens for 630 000 over ni arrangementer)
update festivals set size_band = 'over_100000' where slug = 'british-summer-time-hyde-park';

-- BunkFest: 15 000 -- anslag
--   anslag – gratis folkfestival i Wallingford over tre dager
update festivals set size_band = '10000_50000' where slug = 'bunkfest';

commit;

select name, size_band from festivals where slug in (
   'sonicblast-fest',
   'vagos-metal-fest',
   'balvanyos-summer-open-university-and-student-camp',
   'electric-castle',
   'larock-music-festival',
   'rockstadt-extreme-fest',
   'grape-festival',
   'tolminator',
   'ebrovision',
   'embassa-t',
   'festival-noches-del-botanico',
   'festival-de-la-luz',
   'granada-sound',
   'leyendas-del-rock',
   'mad-cool-festival',
   'monkey-week',
   'paupaterres',
   'portalblau',
   'rock-imperium-festival',
   'sonorama',
   'sun-and-thunder-festival',
   'all-points-east',
   'bestival',
   'bloodstock-open-air',
   'british-summer-time-hyde-park',
   'bunkfest'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
