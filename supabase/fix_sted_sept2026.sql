-- Retter sted-data funnet 2026-09-13.
--
-- Del 1: 13 østerrikske festivaler hadde by og spillested fra en ANNEN
-- festival. Koordinatene var riktige hele veien -- det er teksten som var
-- koblet feil, så kartet har stått riktig mens sidene har vist feil sted.
-- Hver by under er hentet ved å slå opp festivalens egne koordinater.
--
-- Del 2: 3 festivaler hadde feil koordinater og har stått feil på kartet.
--
-- Kjøres i Supabase SQL Editor. Alt skjer i én transaksjon, og siste
-- spørring viser resultatet så du kan se over før du lukker.

begin;

-- === Del 1: by og spillested ===

-- Nova Rock Festival: «Linz» -> «Nickelsdorf»
update festivals set city = 'Nickelsdorf', venue_name = 'Pannonia Fields, Nickelsdorf'
 where slug = 'nova-rock-festival';

-- Oper im Steinbruch St. Margarethen: «Römersteinbruch Sankt Margarethen» -> «St. Margarethen im Burgenland»
update festivals set city = 'St. Margarethen im Burgenland', venue_name = 'Römersteinbruch St. Margarethen'
 where slug = 'oper-im-steinbruch-st-margarethen';

-- Glatt & Verkehrt: «St. Pölten» -> «Krems an der Donau»
update festivals set city = 'Krems an der Donau', venue_name = 'Winzer Krems'
 where slug = 'glatt-og-verkehrt';

-- FM4 Frequency: «Salzburg» -> «St. Pölten»
update festivals set city = 'St. Pölten', venue_name = 'Green Park St. Pölten'
 where slug = 'fm4-frequency';

-- Grafenegg Music Festival: «Krems an der Donau» -> «Grafenegg»
update festivals set city = 'Grafenegg', venue_name = 'Schloss Grafenegg'
 where slug = 'grafenegg-music-festival';

-- Electric Love Festival: «Wien» -> «Salzburg»
update festivals set city = 'Salzburg', venue_name = 'Salzburgring'
 where slug = 'electric-love-festival';

-- Donauinselfest: «Bregenz» -> «Wien»
update festivals set city = 'Wien', venue_name = 'Donauinsel'
 where slug = 'donauinselfest';

-- Vienna Spring Festival: «Erl» -> «Wien»
update festivals set city = 'Wien', venue_name = null
 where slug = 'vienna-spring-festival';

-- Seefestspiele Mörbisch: «St. Margarethen im Burgenland» -> «Mörbisch am See»
update festivals set city = 'Mörbisch am See', venue_name = 'Seebühne Mörbisch'
 where slug = 'seefestspiele-morbisch';

-- Szene Openair: «Mörbisch am See» -> «Lustenau»
update festivals set city = 'Lustenau', venue_name = 'Am Alten Rhein, Lustenau'
 where slug = 'szene-openair';

-- Tiroler Festspiele Erl: «Lustenau» -> «Erl»
update festivals set city = 'Erl', venue_name = 'Festspielhaus Erl'
 where slug = 'tiroler-festspiele-erl';

-- Bregenzer Festspiele: «(tom)» -> «Bregenz»
update festivals set city = 'Bregenz', venue_name = 'Seebühne Bregenz'
 where slug = 'bregenzer-festspiele';

-- Linzer Klangwolke: «Donaulände Linz» -> «Linz»
update festivals set city = 'Linz', venue_name = 'Donaulände Linz'
 where slug = 'linzer-klangwolke';

-- === Del 2: koordinater ===

-- Catton Hall/Park, Walton-on-Trent, Derbyshire -- sto på Old Catton ved Norwich, ~200 km unna
update festivals set latitude = 52.73546, longitude = -1.69608
 where slug = 'bloodstock-open-air';

-- Ferropolis, Gräfenhainichen -- sto på Bakum i Niedersachsen, ~310 km unna
update festivals set latitude = 51.75909, longitude = 12.44875
 where slug = 'staatsforsten-open-air';

-- Timmendorfer Strand -- sto ~16 km unna, inne i Lübeck
update festivals set latitude = 53.99819, longitude = 10.7799
 where slug = 'jazz-baltica';

commit;

-- Kontroll: alle 16 radene etter endring.
select name, city, venue_name, latitude, longitude
  from festivals
 where slug in (
   'nova-rock-festival',
   'oper-im-steinbruch-st-margarethen',
   'glatt-og-verkehrt',
   'fm4-frequency',
   'grafenegg-music-festival',
   'electric-love-festival',
   'donauinselfest',
   'vienna-spring-festival',
   'seefestspiele-morbisch',
   'szene-openair',
   'tiroler-festspiele-erl',
   'bregenzer-festspiele',
   'linzer-klangwolke',
   'bloodstock-open-air',
   'staatsforsten-open-air',
   'jazz-baltica'
 )
 order by country, name;
