-- Undersjanger, runde 2 -- avgjort paa line-up, ikke paa nettsoek.
-- Satt 2026-10-10.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Act of Rage, Paul Elstak, N-Vitral, Outsiders: rotterdamsk hardcore
-- og gabber hele veien.
update festivals set subgenres = array['hardstyle'] where slug = 'sunglow-festival';

-- Helena Hauff, Honey Dijon, Nina Kraviz: techno og house i oeverste sjikt.
update festivals set subgenres = array['techno','house'] where slug = 'soundit-festival';

-- Nulo, Bounce Brigade, Trinchera.XV, NDSTPS: spansk hard techno og bounce.
update festivals set subgenres = array['techno','hardstyle'] where slug = 'heave-festival';

-- === To som ikke er elektroniske i det hele tatt ===
--
-- Begge ble funnet ved aa lese programmet. Samme klasse feil som Canal
-- Street: en elektronisk tagg gjoer dem til kandidater for
-- elektronikaguiden, der de ikke hoerer hjemme.

-- Linzer Klangwolke: Bruckner Orchester Linz, St. Florianer Saengerknaben,
-- Rafael Fingerlos. Klassisk friluftsarrangement.
update festivals
   set tags = array_remove(tags, 'Elektronisk & Dans'),
       category = 'Klassisk'
 where slug = 'linzer-klangwolke';

-- Vienna Spring Festival: Carmen, Suor Angelica / Cleopatre. Opera.
update festivals
   set tags = array_remove(tags, 'Elektronisk & Dans'),
       category = 'Klassisk'
 where slug = 'vienna-spring-festival';

commit;

select name, category, tags, subgenres from festivals where slug in (
   'sunglow-festival', 'soundit-festival', 'heave-festival', 'linzer-klangwolke', 'vienna-spring-festival'
);
