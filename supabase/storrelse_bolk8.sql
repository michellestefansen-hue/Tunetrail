-- Publikumstall, bolk 8 av 8 (rock/metal) -- 26 festivaler i Tyskland
-- og Oesterrike.
-- Hentet med nettsoek 2026-09-13. Alle 26 baandene stemmer med tallet sitt.
-- 11 funne tall, 1 kapasitet, 14 begrunnede anslag.
--
-- Hoeyest anslagsandel av alle bolkene. Aarsaken er ikke at tyske kilder
-- er daarlige, men at denne bolken sitter igjen med de smaa,
-- selvorganiserte festivalene -- StuStaCulum, Stemweder, Weinturm,
-- Wolfszeit -- som ikke rapporterer tall noe sted.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- MS Dockville: 60 000 -- anslag
--   anslag – ca. 25 000 per dag over tre dager; hamburg-travel.com
update festivals set size_band = '50000_100000' where slug = 'ms-dockville';

-- Maifeld Derby: 8 000 -- anslag
--   anslag – Maimarktgelände i Mannheim, boutiquefestival
update festivals set size_band = '2000_10000' where slug = 'maifeld-derby';

-- Open Flair: 20 000 -- tall
--   de.wikipedia.org – utsolgt hvert år 2009-2019
update festivals set size_band = '10000_50000' where slug = 'open-flair';

-- Orange Blossom Special Festival: 5 000 -- anslag
--   anslag – americana-festival i Beverungen
update festivals set size_band = '2000_10000' where slug = 'orange-blossom-special-festival';

-- Party.San Metal Open Air: 8 500 -- kapasitet
--   festivalsunited.com (kapasitet, flyplassen ved Obermehler-Schlotheim)
update festivals set size_band = '2000_10000' where slug = 'party-san-metal-open-air';

-- Reeperbahn Festival: 48 000 (2025) -- tall
--   hamburg.t-online.de – 43 000 publikum og 5 000 bransjefolk, 600 konserter på 70 spillesteder
update festivals set size_band = '10000_50000' where slug = 'reeperbahn-festival';

-- Reload Festival: 10 000 -- anslag
--   anslag – metalfestival i Sulingen
update festivals set size_band = '10000_50000' where slug = 'reload-festival';

-- Rockharz: 27 500 (2026) -- tall
--   live-and-loud.de – 25 000 helgebilletter utsolgt, pluss dagsgjester
update festivals set size_band = '10000_50000' where slug = 'rockharz';

-- Rosenheim Sommerfestival: 20 000 -- anslag
--   anslag – konsertrekke på Loretowiese over to uker
update festivals set size_band = '10000_50000' where slug = 'rosenheim-sommerfestival';

-- Schlossgrabenfest: 150 000 (2026) -- tall
--   hessenschau.de – Hessens største musikkfestival, delvis gratis
update festivals set size_band = 'over_100000' where slug = 'schlossgrabenfest';

-- Sommerspiele Koblenz: 10 000 -- anslag
--   anslag – konsertrekke i Rheinanlagen
update festivals set size_band = '10000_50000' where slug = 'sommerspiele-koblenz';

-- Staatsforsten Open-Air: 5 000 -- anslag
--   anslag – endagsfestival på Ferropolis
update festivals set size_band = '2000_10000' where slug = 'staatsforsten-open-air';

-- Stemweder Open Air: 5 000 -- anslag
--   anslag – selvorganisert festival i Stemwede
update festivals set size_band = '2000_10000' where slug = 'stemweder-open-air';

-- StuStaCulum: 8 000 -- anslag
--   anslag – studentfestival i Studentenstadt Freimann, München
update festivals set size_band = '2000_10000' where slug = 'stustaculum';

-- Summer Breeze Open Air: 45 000 (2026) -- tall
--   flz.de – utsolgt i desember året før, rekord
update festivals set size_band = '10000_50000' where slug = 'summer-breeze-open-air';

-- Taubertal-Festival: 45 000 -- tall
--   fnweb.de – 15 000 per dag på Eiswiese i tre dager
update festivals set size_band = '10000_50000' where slug = 'taubertal-festival';

-- Theatron-Festival: 100 000 -- tall
--   olympiapark.de – gratis, daglige konserter ved Olympiasee i august
update festivals set size_band = 'over_100000' where slug = 'theatron-festival';

-- Umsonst & Draußen: 20 000 -- anslag
--   anslag – gratisfestival i Bad Kissingen
update festivals set size_band = '10000_50000' where slug = 'umsonst-og-draussen';

-- Wave-Gotik-Treffen: 19 000 (2025) -- tall
--   leipzig.de – armbånd solgt; ca. 50 spillesteder i Leipzig
update festivals set size_band = '10000_50000' where slug = 'wave-gotik-treffen';

-- Weinturm Open Air: 5 000 -- anslag
--   anslag – liten tysk festival
update festivals set size_band = '2000_10000' where slug = 'weinturm-open-air';

-- Wolfszeit Festival: 3 000 -- anslag
--   anslag – pagan/folk-metalfestival i Waffenrod
update festivals set size_band = '2000_10000' where slug = 'wolfszeit-festival';

-- Zappanale: 3 000 -- anslag
--   anslag – Zappa-festival i Bad Doberan
update festivals set size_band = '2000_10000' where slug = 'zappanale';

-- Zelt-Musik-Festival: 100 000 (2026) -- tall
--   breisgau.live – tre uker med ca. 180 arrangementer i teltbyen på Mundenhof
update festivals set size_band = 'over_100000' where slug = 'zelt-musik-festival';

-- Donauinselfest: 2 800 000 (2025) -- tall
--   der.orf.at – Europas største gratis open air, tre dager, 4,5 km festivalområde
update festivals set size_band = 'over_100000' where slug = 'donauinselfest';

-- FM4 Frequency: 140 000 -- tall
--   frequency.at – ca. 40 000 per dag i Green Park St. Pölten
update festivals set size_band = 'over_100000' where slug = 'fm4-frequency';

-- Szene Openair: 10 000 -- anslag
--   anslag – festival i Lustenau i Vorarlberg
update festivals set size_band = '10000_50000' where slug = 'szene-openair';

commit;

select name, size_band from festivals where slug in (
   'ms-dockville',
   'maifeld-derby',
   'open-flair',
   'orange-blossom-special-festival',
   'party-san-metal-open-air',
   'reeperbahn-festival',
   'reload-festival',
   'rockharz',
   'rosenheim-sommerfestival',
   'schlossgrabenfest',
   'sommerspiele-koblenz',
   'staatsforsten-open-air',
   'stemweder-open-air',
   'stustaculum',
   'summer-breeze-open-air',
   'taubertal-festival',
   'theatron-festival',
   'umsonst-og-draussen',
   'wave-gotik-treffen',
   'weinturm-open-air',
   'wolfszeit-festival',
   'zappanale',
   'zelt-musik-festival',
   'donauinselfest',
   'fm4-frequency',
   'szene-openair'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
