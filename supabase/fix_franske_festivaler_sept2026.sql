-- To rettinger funnet under publikumsresearchen for bolk 2, 2026-09-13.
--
-- Ingen sletting her. Begge festivalene har bare en 2026-utgave, og den er
-- allerede passert, saa de staar helt riktig uten kommende dato. Det som
-- mangler er kontekst en leser trenger for aa forstaa hvorfor.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Le Jardin du Michel flyttet fra Bulligny til Toul i 2017, men basen sa
-- fortsatt Bulligny. Koordinatene pekte allerede paa Toul -- det var bare
-- bynavnet som hang igjen, saa kartet har staatt riktig hele tiden.
-- 2026-utgaven gikk paa Toul og Dommartin-les-Toul, 21. utgave, 21 000
-- festivaldeltakere. Kilde: jaimelesfestivals.fr
update festivals
   set city = 'Toul',
       venue_name = 'Toul / Dommartin-lès-Toul'
 where slug = 'le-jardin-du-michel';

-- Festival de la Paille ble lagt ned etter 2026-utgaven: «les difficultés
-- économiques ont rattrapé ce festival associatif». Skjemaet har ingen
-- status for avsluttet, saa det eneste stedet dette kan staa er
-- beskrivelsen -- ellers ser raden bare ut som en festival som ikke har
-- annonsert neste aar enda. Kilde: france3-regions.franceinfo.fr
update festivals
   set description = 'A long-running associative rock and pop festival held at Métabief in the Haut-Doubs from 2000 to 2026, drawing around 25,000 people a year at its peak. The 2026 edition was its last: rising artist fees made the volunteer-run model unsustainable.'
 where slug = 'festival-de-la-paille'
   and description is null;

commit;

-- Kontroll.
select name, city, venue_name, left(coalesce(description, '(ingen)'), 70) as beskrivelse
  from festivals
 where slug in ('le-jardin-du-michel', 'festival-de-la-paille');
