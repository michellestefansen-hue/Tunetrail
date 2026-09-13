-- Publikumstall, bolk 2 av 8 (rock/metal) -- 27 franske festivaler.
-- Hentet med nettsoek 2026-09-13, kontrollert: alle 27 baandene stemmer
-- med tallet sitt. 21 er funne tall, 2 kapasitet, 4 begrunnede anslag.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Ecaussystème: 36 000 (2024) -- tall
--   medialot.fr
update festivals set size_band = '10000_50000' where slug = 'ecaussysteme';

-- Europavox: 45 000 (2025) -- tall
--   europavoxfestivals.com
update festivals set size_band = '10000_50000' where slug = 'europavox';

-- Festival Les Indisciplinées: 4 000 -- anslag
--   anslag – 10 dager på flere klubbscener i Lorient, Hydrophone ca. 500 plasser
update festivals set size_band = '2000_10000' where slug = 'festival-les-indisciplinees';

-- Festival Tempo Rives: 38 000 (2016) -- tall
--   angers.fr – 11 gratiskonserter gjennom sommeren
update festivals set size_band = '10000_50000' where slug = 'festival-tempo-rives';

-- Festival Terres du Son: 54 000 (2026) -- tall
--   ici.fr
update festivals set size_band = '50000_100000' where slug = 'festival-terres-du-son';

-- Festival de Bobital: 21 000 (2017) -- tall
--   culture.newstank.fr
update festivals set size_band = '10000_50000' where slug = 'festival-de-bobital';

-- Festival de Buguélès: 20 000 (2026) -- tall
--   paysan-breton.fr – 10 000 per kveld i to kvelder
update festivals set size_band = '10000_50000' where slug = 'festival-de-bugueles';

-- Festival de Néoules: 7 500 -- anslag
--   anslag – ca. 2 500 per kveld i tre kvelder, fr.wikipedia.org
update festivals set size_band = '2000_10000' where slug = 'festival-de-neoules';

-- Festival de Poupet: 55 000 -- tall
--   ici.fr – 31. utgave, spredt over tre uker
update festivals set size_band = '50000_100000' where slug = 'festival-de-poupet';

-- Festival de la paille: 25 000 (2019) -- tall
--   macommune.info – 20 000 i 2025
update festivals set size_band = '10000_50000' where slug = 'festival-de-la-paille';

-- Festival des arts sonnés: 4 000 -- kapasitet
--   fr.wikipedia.org (kapasitet 2 000 per dag i to dager)
update festivals set size_band = '2000_10000' where slug = 'festival-des-arts-sonnes';

-- Festival du Roi Arthur: 70 000 -- tall
--   francebleu.fr – hvorav 55 000 betalende
update festivals set size_band = '50000_100000' where slug = 'festival-du-roi-arthur';

-- Festival estival de Trélazé: 150 000 -- tall
--   my-angers.info – gratisfestival
update festivals set size_band = 'over_100000' where slug = 'festival-estival-de-trelaze';

-- Foreztival: 43 000 (2025) -- tall
--   activradio.com
update festivals set size_band = '10000_50000' where slug = 'foreztival';

-- Fête du bruit dans Landerneau: 52 000 (2016) -- tall
--   fr.wikipedia.org
update festivals set size_band = '50000_100000' where slug = 'fete-du-bruit-dans-landerneau';

-- Fête du bruit dans Saint-Nolff: 54 000 (2025) -- tall
--   vannes-bretagne-sud.bzh
update festivals set size_band = '50000_100000' where slug = 'fete-du-bruit-dans-saint-nolff';

-- La Poule des Champs: 8 500 (2026) -- tall
--   touslesfestivals.com
update festivals set size_band = '2000_10000' where slug = 'la-poule-des-champs';

-- La Route du Rock: 30 000 (2026) -- tall
--   soundofbrit.fr – beste besøk på tolv år
update festivals set size_band = '10000_50000' where slug = 'la-route-du-rock';

-- Le Chien à Plumes: 12 000 (2026) -- tall
--   jhm.fr
update festivals set size_band = '10000_50000' where slug = 'le-chien-a-plumes';

-- Le Jardin du Michel: 21 000 (2026) -- tall
--   jaimelesfestivals.fr
update festivals set size_band = '10000_50000' where slug = 'le-jardin-du-michel';

-- Les Déferlantes Sud de France: 100 000 (2025) -- tall
--   le-journal-catalan.com
update festivals set size_band = 'over_100000' where slug = 'les-deferlantes-sud-de-france';

-- Les Nuits d'Istres: 4 800 -- tall
--   maritima.fr – 5 251 plasser over tre kvelder, 91 % belegg
update festivals set size_band = '2000_10000' where slug = 'les-nuits-d-istres';

-- Les Terrasses du jeudi: 15 000 -- anslag
--   anslag – gratis, ca. 30 konserter over fire torsdager, rouen.fr omtaler «flere titusen»
update festivals set size_band = '10000_50000' where slug = 'les-terrasses-du-jeudi';

-- Mayday festival: 18 000 (2024) -- tall
--   u-bordeaux.fr – gratis studentfestival
update festivals set size_band = '10000_50000' where slug = 'mayday-festival';

-- Metal Ride Fest: 1 293 -- kapasitet
--   lautrecanalnancy.fr (kapasitet, L'Autre Canal grande salle ståplasser, én dag)
update festivals set size_band = '200_2000' where slug = 'metal-ride-fest';

-- Ouaille Note Festival: 3 000 (2025) -- anslag
--   anslag – utsolgt, 1 500 per dag i to dager, culturedub.com
update festivals set size_band = '2000_10000' where slug = 'ouaille-note-festival';

-- Poulpaphone: 4 000 (2024) -- tall
--   agglo-boulonnais.fr
update festivals set size_band = '2000_10000' where slug = 'poulpaphone';

commit;

select name, size_band from festivals where slug in (
   'ecaussysteme',
   'europavox',
   'festival-les-indisciplinees',
   'festival-tempo-rives',
   'festival-terres-du-son',
   'festival-de-bobital',
   'festival-de-bugueles',
   'festival-de-neoules',
   'festival-de-poupet',
   'festival-de-la-paille',
   'festival-des-arts-sonnes',
   'festival-du-roi-arthur',
   'festival-estival-de-trelaze',
   'foreztival',
   'fete-du-bruit-dans-landerneau',
   'fete-du-bruit-dans-saint-nolff',
   'la-poule-des-champs',
   'la-route-du-rock',
   'le-chien-a-plumes',
   'le-jardin-du-michel',
   'les-deferlantes-sud-de-france',
   'les-nuits-d-istres',
   'les-terrasses-du-jeudi',
   'mayday-festival',
   'metal-ride-fest',
   'ouaille-note-festival',
   'poulpaphone'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
