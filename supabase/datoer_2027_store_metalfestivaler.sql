-- 2027-datoer for ti store rock- og metalfestivaler.
-- Oppgitt for haand 2026-09-13. Ingen av dem hadde en 2027-utgave fra foer.
--
-- Bare datoer: billettlenke og program kommer naar de kunngjoeres. Sidene
-- viser fjoraarets line-up merket «Spilte i 2026» inntil da, saa de gaar
-- ikke tomme av at datoene legges inn.
--
-- Trygg aa kjoere flere ganger: hopper over festivaler som alt har 2027.

begin;

-- Wacken Open Air
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-07-28', '2027-07-31', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'wacken-open-air'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Graspop Metal Meeting
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-06-17', '2027-06-20', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'graspop-metal-meeting'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Nova Rock Festival
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-06-10', '2027-06-12', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'nova-rock-festival'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Bloodstock Open Air
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-05', '2027-08-08', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'bloodstock-open-air'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Resurrection Fest
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-06-30', '2027-07-03', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'resurrection-fest'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Summer Breeze Open Air
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-18', '2027-08-21', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'summer-breeze-open-air'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Alcatraz Metal Festival
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-05', '2027-08-08', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'alcatraz-metal-festival'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Brutal Assault
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-04', '2027-08-07', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'brutal-assault'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Rock for People
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-06-02', '2027-06-05', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'rock-for-people'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

-- Motocultor Festival
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-19', '2027-08-22', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'motocultor-festival'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );

commit;

-- Kontroll: 2027-utgavene etter innlegging, i datorekkefoelge.
select f.name, e.date_from, e.date_to
  from festivals f join festival_editions e on e.festival_id = f.id
 where e.year = 2027 and f.slug in (
   'wacken-open-air',
   'graspop-metal-meeting',
   'nova-rock-festival',
   'bloodstock-open-air',
   'resurrection-fest',
   'summer-breeze-open-air',
   'alcatraz-metal-festival',
   'brutal-assault',
   'rock-for-people',
   'motocultor-festival'
 )
 order by e.date_from;
