-- Publikumstall, bolk 7 av 8 (rock/metal) -- 26 festivaler i Sverige, Tsjekkia og Tyskland.
-- Hentet med nettsoek 2026-09-13. Alle 26 baandene stemmer med tallet sitt.
-- 14 funne tall, 3 kapasitet, 9 anslag.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Nynäskalaset: 3 000 -- anslag
--   anslag – kommunal byfestival i Nynäshamn
update festivals set size_band = '2000_10000' where slug = 'nynaskalaset';

-- Brutal Assault: 21 000 (2025) -- tall
--   cesky.radio.cz – Josefov-festningen, inkludert artister og stab
update festivals set size_band = '10000_50000' where slug = 'brutal-assault';

-- Colours of Ostrava: 40 000 -- tall
--   english.radio.cz
update festivals set size_band = '10000_50000' where slug = 'colours-of-ostrava';

-- Metronome Prague: 22 000 (2022) -- tall
--   metronome.cz – 24 000 i 2023
update festivals set size_band = '10000_50000' where slug = 'metronome-prague';

-- Obscene Extreme: 4 000 -- anslag
--   anslag – «tusenvis» på Bojiště, ca. 80 % tilreisende; trutnovinky.cz
update festivals set size_band = '2000_10000' where slug = 'obscene-extreme';

-- TrutnOFF: 8 000 -- anslag
--   anslag – arrangøren offentliggjør av tradisjon ikke tall; cs.wikipedia.org
update festivals set size_band = '2000_10000' where slug = 'trutnov-open-air-music-festival';

-- Zámostí: 4 000 -- anslag
--   anslag – gratis byfestival i Třebíč
update festivals set size_band = '2000_10000' where slug = 'zamosti';

-- Amphi Festival: 24 000 -- tall
--   amphi-festival.de – ca. 12 000 per dag på Tanzbrunnen
update festivals set size_band = '10000_50000' where slug = 'amphi-festival';

-- Burg-Herzberg-Festival: 11 000 -- tall
--   hessenschau.de – Europas eldste hippiefestival
update festivals set size_band = '10000_50000' where slug = 'burg-herzberg-festival';

-- Calwer Klostersommer in Hirsau: 4 000 -- anslag
--   anslag – konsertrekke i klosterruinen over en uke
update festivals set size_band = '2000_10000' where slug = 'calwer-klostersommer-in-hirsau';

-- Das Fest: 260 000 (2026) -- tall
--   ka-news.de – fire dager i Günther-Klotz-Anlage, gratis hoveddel
update festivals set size_band = 'over_100000' where slug = 'das-fest';

-- Elbriot: 10 000 -- kapasitet
--   hamburg.de (kapasitet, Großmarkt; 14 000 på første utgave i 2013)
update festivals set size_band = '10000_50000' where slug = 'elbriot';

-- Full Force: 20 000 -- tall
--   blick.de – Ferropolis tar 25 000
update festivals set size_band = '10000_50000' where slug = 'full-force';

-- Full Rewind Festival: 4 000 -- anslag
--   anslag – endagsfestival i Roitzschjora
update festivals set size_band = '2000_10000' where slug = 'full-rewind-festival';

-- Fährmannsfest: 10 000 -- tall
--   de.wikipedia.org – regionens største alternative open air, tre dager
update festivals set size_band = '10000_50000' where slug = 'fahrmannsfest';

-- Haldern Pop: 5 000 -- tall
--   haldernpop.com – 5 000 billetter, utsolgt før programmet slippes
update festivals set size_band = '2000_10000' where slug = 'haldern-pop';

-- Highfield Festival: 28 000 (2026) -- tall
--   de.wikipedia.org – Störmthaler See
update festivals set size_band = '10000_50000' where slug = 'highfield-festival';

-- Höpen Air: 1 000 -- anslag
--   anslag – liten tysk landsbyfestival
update festivals set size_band = '200_2000' where slug = 'hopen-air';

-- Immergut Festival: 5 000 -- kapasitet
--   immergutrocken.de (kapasitet; utsolgt hvert år fram til 2024)
update festivals set size_band = '2000_10000' where slug = 'immergut-festival';

-- Keep It True: 3 000 -- kapasitet
--   festivalsunited.com (kapasitet, Tauber-Franken-Halle; alltid utsolgt)
update festivals set size_band = '2000_10000' where slug = 'keep-it-true';

-- KulturPur: 54 000 (2026) -- tall
--   radiosiegen.de – teltfestival på Giller i pinsen
update festivals set size_band = '50000_100000' where slug = 'kulturpur';

-- Kulturarena: 70 000 -- tall
--   kulturarena.de – seks uker på Theatervorplatz i Jena
update festivals set size_band = '50000_100000' where slug = 'kulturarena';

-- Kulturzelt: 15 000 -- anslag
--   anslag – teltsesong i Kassel over flere uker
update festivals set size_band = '10000_50000' where slug = 'kulturzelt';

-- Lollapalooza Berlin: 120 000 (2025) -- tall
--   tagesspiegel.de – ca. 60 000 per dag på Olympiastadion
update festivals set size_band = 'over_100000' where slug = 'lollapalooza-berlin';

-- Lott-Festival: 3 000 -- anslag
--   anslag – liten tysk festival, ingen tall publisert
update festivals set size_band = '2000_10000' where slug = 'lott-festival';

-- M'era Luna Festival: 25 000 (2026) -- tall
--   hildesheimer-presse.de – flyplassen i Hildesheim
update festivals set size_band = '10000_50000' where slug = 'm-era-luna-festival';

commit;

select name, size_band from festivals where slug in (
   'nynaskalaset',
   'brutal-assault',
   'colours-of-ostrava',
   'metronome-prague',
   'obscene-extreme',
   'trutnov-open-air-music-festival',
   'zamosti',
   'amphi-festival',
   'burg-herzberg-festival',
   'calwer-klostersommer-in-hirsau',
   'das-fest',
   'elbriot',
   'full-force',
   'full-rewind-festival',
   'fahrmannsfest',
   'haldern-pop',
   'highfield-festival',
   'hopen-air',
   'immergut-festival',
   'keep-it-true',
   'kulturpur',
   'kulturarena',
   'kulturzelt',
   'lollapalooza-berlin',
   'lott-festival',
   'm-era-luna-festival'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
