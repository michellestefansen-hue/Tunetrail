-- Publikumstall, bolk 4 av 8 (rock/metal) -- 26 festivaler i Nederland,
-- Norge, Polen og Portugal.
-- Hentet med nettsoek 2026-09-13. Alle 26 baandene stemmer med tallet sitt.
-- 16 funne tall, 1 kapasitet, 9 begrunnede anslag.
--
-- Hoeyere anslagsandel enn bolk 2 og 3, og det er et moenster: norske og
-- nederlandske smaafestivaler publiserer sjelden besoekstall, mens fransk,
-- italiensk og portugisisk lokalpresse rapporterer dem rutinemessig.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Jera on Air: 40 000 (2025) -- tall
--   jeraonair.nl – ca. 15 000 per dag i tre dager
update festivals set size_band = '10000_50000' where slug = 'jera-on-air';

-- Kabaal Am Gemaal: 1 000 -- anslag
--   anslag – lokal endagsfestival, ingen tall publisert
update festivals set size_band = '200_2000' where slug = 'kabaal-am-gemaal';

-- Left of the Dial: 15 000 -- tall
--   leftofthedial.nl – ca. 5 000 per dag i tre dager, 25 scener i Rotterdam sentrum
update festivals set size_band = '10000_50000' where slug = 'left-of-the-dial';

-- Nirwana Tuinfeest: 17 000 -- tall
--   nl.wikipedia.org – drøyt 5 000 per dag, holdes bevisst liten
update festivals set size_band = '10000_50000' where slug = 'nirwana-tuinfeest';

-- Pop on Top: 14 000 (2023) -- tall
--   nl.wikipedia.org
update festivals set size_band = '10000_50000' where slug = 'pop-on-top';

-- Schippop: 2 000 -- tall
--   nl.wikipedia.org – gratis
update festivals set size_band = '2000_10000' where slug = 'schippop';

-- Zomerparkfeest: 94 000 -- tall
--   immaterieelerfgoed.nl – gratis, fire dager, 130 akter
update festivals set size_band = '50000_100000' where slug = 'zomerparkfeest';

-- Autumn Rock Festival: 500 -- anslag
--   anslag – liten norsk endagsfestival, ingen tall publisert
update festivals set size_band = '200_2000' where slug = 'autumn-rock-festival';

-- Beyond The Gates: 3 000 -- anslag
--   anslag – USF Verftet som hovedscene over fire dager; en.wikipedia.org
update festivals set size_band = '2000_10000' where slug = 'beyond-the-gates';

-- Blues in Hell: 5 000 -- anslag
--   anslag – ca. 100 konserter over tre dager på Scandic Hell; visitnorway.com omtaler «tusenvis»
update festivals set size_band = '2000_10000' where slug = 'blues-in-hell';

-- Bukta Tromsø Open Air Festival: 15 000 -- anslag
--   anslag – to dager i Telegrafbukta, 5 000 alt i 2004; en.wikipedia.org
update festivals set size_band = '10000_50000' where slug = 'bukta-tromso-open-air-festival';

-- Drammen Metalfest: 800 -- anslag
--   anslag – klubbfestival, ingen tall publisert
update festivals set size_band = '200_2000' where slug = 'drammen-metalfest';

-- Kirkenes Live: 1 500 -- anslag
--   anslag – todagers festival i en by med 3 500 innbyggere
update festivals set size_band = '200_2000' where slug = 'kirkenes-live';

-- Lillehammer Live: 4 000 -- anslag
--   anslag – byfestival, ingen tall publisert
update festivals set size_band = '2000_10000' where slug = 'lillehammer-live';

-- Midgardsblot: 5 000 (2022) -- tall
--   en.wikipedia.org – ca. 5 000 per dag
update festivals set size_band = '2000_10000' where slug = 'midgardsblot';

-- Pstereo: 15 000 -- kapasitet
--   pstereo.no (kapasitet 7 500 på Marinen, 6 000 billetter fredag og lørdag)
update festivals set size_band = '10000_50000' where slug = 'pstereo-festival';

-- Slottsfjellfestivalen: 44 000 (2025) -- tall
--   mynewsdesk.com – utsolgt, 22 000 per dag i to dager
update festivals set size_band = '10000_50000' where slug = 'slottsfjellfestivalen';

-- Traena Music Festival: 2 000 -- tall
--   en.wikipedia.org – på en øygruppe med 450 fastboende
update festivals set size_band = '2000_10000' where slug = 'traena-music-festival';

-- Vinjerock: 3 500 -- tall
--   vinjerock.no – 3 000 festivalpass, taket satt for å skåne naturen
update festivals set size_band = '2000_10000' where slug = 'vinjerock';

-- by:Larm: 8 000 -- tall
--   en.wikipedia.org – 5 000 festivalgjester og 3 000 bransjedelegater
update festivals set size_band = '2000_10000' where slug = 'by-larm';

-- Jarocin Festival: 20 000 (2022) -- tall
--   pl.wikipedia.org – rekord i nyere tid; 10 000 i 2026
update festivals set size_band = '10000_50000' where slug = 'jarocin-festival';

-- CA Vilar de Mouros: 55 000 (2025) -- tall
--   publico.pt – 60-årsjubileum; arrangøren oppgir ikke lenger tall selv
update festivals set size_band = '50000_100000' where slug = 'ca-vilar-de-mouros';

-- Festival F: 55 000 -- tall
--   cmjornal.pt – tre til fire dager, 10-15 000 per dag
update festivals set size_band = '50000_100000' where slug = 'festival-f';

-- MEO Monte Verde: 30 000 -- anslag
--   anslag – største festival på Azorene, tre dager på Monte Verde-stranda; meomonteverde.pt
update festivals set size_band = '10000_50000' where slug = 'meo-monte-verde';

-- N2 Festival: 18 000 (2026) -- tall
--   airinformacao.pt – gratis, tre dager i Chaves bypark
update festivals set size_band = '10000_50000' where slug = 'n2-festival';

-- OUT.FEST: 2 000 -- tall
--   outfest.pt – oppgir «mer enn 2 000» årlig
update festivals set size_band = '2000_10000' where slug = 'out-fest';

commit;

select name, size_band from festivals where slug in (
   'jera-on-air',
   'kabaal-am-gemaal',
   'left-of-the-dial',
   'nirwana-tuinfeest',
   'pop-on-top',
   'schippop',
   'zomerparkfeest',
   'autumn-rock-festival',
   'beyond-the-gates',
   'blues-in-hell',
   'bukta-tromso-open-air-festival',
   'drammen-metalfest',
   'kirkenes-live',
   'lillehammer-live',
   'midgardsblot',
   'pstereo-festival',
   'slottsfjellfestivalen',
   'traena-music-festival',
   'vinjerock',
   'by-larm',
   'jarocin-festival',
   'ca-vilar-de-mouros',
   'festival-f',
   'meo-monte-verde',
   'n2-festival',
   'out-fest'
 ) order by array_position(array['over_100000','50000_100000','10000_50000',
   '2000_10000','200_2000','under_200'], size_band), name;
