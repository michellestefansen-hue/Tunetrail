-- NEOPOP 2027: 5.-7. august, Forte de Santiago da Barra i Viana do Castelo.
-- Kilde: neopopfestival.com, bekreftet i omtale hos viveroporto.com.
--
-- Bare datoer. Billettlenke og program er ikke kunngjort, og sida viser
-- fjoraarets line-up merket med aar inntil de kommer.
--
-- Merk: 2026-utgaven ble rapportert bade som 5.-7. og 6.-8. august i
-- forskjellige kilder. 2027-datoene staar likt hos arrangoeren og i omtalen,
-- saa de er de sikreste vi har -- men verdt en ny sjekk naar billettene slippes.
--
-- Trygg aa kjoere flere ganger.

begin;
insert into festival_editions (festival_id, year, date_from, date_to, program, source)
select f.id, 2027, '2027-08-05', '2027-08-07', '[]'::jsonb, 'manual'
  from festivals f
 where f.slug = 'neopop-festival'
   and not exists (
     select 1 from festival_editions e
      where e.festival_id = f.id and e.year = 2027
   );
commit;

select f.name, e.year, e.date_from, e.date_to
  from festivals f join festival_editions e on e.festival_id = f.id
 where f.slug = 'neopop-festival' order by e.year;
