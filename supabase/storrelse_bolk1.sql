-- Publikumstall, bolk 1 av 8 (rock/metal). 27 festivaler.
-- Hentet med nettsøk i ChatGPT 2026-09-13, kontrollert her:
-- alle 27 båndene stemmer med tallet sitt.
--
-- 12 av 27 er anslag. Det er ventet for smaa, lokale festivaler, og
-- anslagene er begrunnet i kapasitet eller dagstall, ikke gjettet.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Jazz Bilzen: 2 200 (1998) – anslag
update festivals set size_band = '2000_10000' where slug = 'jazz-bilzen';

-- Maanrock: >100 000 (2026) – tall
update festivals set size_band = 'over_100000' where slug = 'maanrock';

-- Oilsjt Omploft Fest: 360 (2026) – kapasitet
update festivals set size_band = '200_2000' where slug = 'oilsjt-omploft-fest';

-- Sonic City: 1 125 (2025) – kapasitet
update festivals set size_band = '200_2000' where slug = 'sonic-city';

-- Hills Of Rock: 60 000 (2026) – anslag
update festivals set size_band = '50000_100000' where slug = 'hills-of-rock';

-- Bork Festival: 28 000 (2025) – anslag
update festivals set size_band = '10000_50000' where slug = 'bork-festival';

-- GrimFest: 5 000 (2026) – anslag
update festivals set size_band = '2000_10000' where slug = 'grimfest';

-- Haze over Haarum: 7 000 (2026) – kapasitet
update festivals set size_band = '2000_10000' where slug = 'haze-over-haarum';

-- Kløften Festival: 26 100 (2026) – anslag
update festivals set size_band = '10000_50000' where slug = 'kloften-festival';

-- Midtfyns Festival: 5 200 (2025) – tall
update festivals set size_band = '2000_10000' where slug = 'midtfyns-festival';

-- New Note Festival: 500 (2025) – tall
update festivals set size_band = '200_2000' where slug = 'new-note-festival';

-- Nordalsfestivalen: 5 000 (2026) – anslag
update festivals set size_band = '2000_10000' where slug = 'nordalsfestivalen';

-- Nykøbing Falster Festuge: 5 000 (2026) – anslag
update festivals set size_band = '2000_10000' where slug = 'nykobing-falster-festuge';

-- Rock in Frederikshavn: 6 500 (2026) – tall
update festivals set size_band = '2000_10000' where slug = 'rock-in-frederikshavn';

-- SYD FOR SOLEN: 25 000 (2026) – kapasitet
update festivals set size_band = '10000_50000' where slug = 'syd-for-solen';

-- UHØRT Festival: 2 000 (2025) – anslag
-- ENDRET fra 2000_10000 til 200_2000: «opptil 2 000» er et tak, ikke et tall -- laveste band ved tvil
update festivals set size_band = '200_2000' where slug = 'uhort-festival';

-- Å-festival: 6 000 (2026) – tall
update festivals set size_band = '2000_10000' where slug = 'a-festival';

-- Hard Rock Laager: 3 000 (2026) – kapasitet
update festivals set size_band = '2000_10000' where slug = 'hard-rock-laager';

-- Hellsinki Metal Festival: 16 000 (2026) – tall
update festivals set size_band = '10000_50000' where slug = 'hellsinki-metal-festival';

-- Puntala-rock: 1 350 (2022) – tall
update festivals set size_band = '200_2000' where slug = 'puntala-rock';

-- Rockoff: 28 000 (2026) – anslag
update festivals set size_band = '10000_50000' where slug = 'rockoff';

-- 24 heures de l'INSA de Lyon: 30 000 (2026) – anslag
update festivals set size_band = '10000_50000' where slug = '24-heures-de-l-insa-de-lyon';

-- Alsace Wine Fair: 318 181 (2026) – tall
-- ENDRET fra over_100000 til 10000_50000: de 318 181 er totalbesoeket paa en ti
-- dager lang vinmesse, ikke publikum paa konsertene. Satt til konsertnivaa.
update festivals set size_band = '10000_50000' where slug = 'alsace-wine-fair';

-- Cabaret Frappé: 40 000 (2026) – anslag
update festivals set size_band = '10000_50000' where slug = 'cabaret-frappe';

-- Chauffer dans la noirceur: 13 000 (2026) – tall
update festivals set size_band = '10000_50000' where slug = 'chauffer-dans-la-noirceur';

-- Crescendo association: 4 500 (2026) – anslag
update festivals set size_band = '2000_10000' where slug = 'crescendo-association';

-- Décibulles: 36 000 (2026) – tall
update festivals set size_band = '10000_50000' where slug = 'decibulles';

commit;

-- Kontroll: alle 27 etter endring, storst forst.
select name, size_band from festivals
 where slug in (
   'jazz-bilzen',
   'maanrock',
   'oilsjt-omploft-fest',
   'sonic-city',
   'hills-of-rock',
   'bork-festival',
   'grimfest',
   'haze-over-haarum',
   'kloften-festival',
   'midtfyns-festival',
   'new-note-festival',
   'nordalsfestivalen',
   'nykobing-falster-festuge',
   'rock-in-frederikshavn',
   'syd-for-solen',
   'uhort-festival',
   'a-festival',
   'hard-rock-laager',
   'hellsinki-metal-festival',
   'puntala-rock',
   'rockoff',
   '24-heures-de-l-insa-de-lyon',
   'alsace-wine-fair',
   'cabaret-frappe',
   'chauffer-dans-la-noirceur',
   'crescendo-association',
   'decibulles'
 )
 order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
