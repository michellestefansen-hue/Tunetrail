-- Ticketmaster-lenker for 2027, oktober 2026.
--
-- Copenhell, Lollapalooza Berlin og Way Out West har allerede en 2027-utgave,
-- men billettlenken peker et annet sted. Den byttes til Ticketmaster.
-- Bergenfest mangler 2027-utgaven og får den her (9.-12. juni 2027).
-- Ilosaarirock har allerede riktig lenke og er ikke med.
--
-- Fila stopper med en feil, og endrer ingenting, hvis en festival eller en
-- 2027-utgave ikke finnes. Resultatet til slutt viser gammel og ny lenke side
-- om side, saa den gamle kan settes tilbake om noe er galt.

begin;

create temp table gamle_lenker on commit preserve rows as
select f.slug, e.ticket_url as gammel_lenke
  from festival_editions e
  join festivals f on f.id = e.festival_id
 where e.year = 2027
   and f.slug in ('copenhell', 'lollapalooza-berlin', 'way-out-west', 'bergenfest');

do $$
declare
  ny record;
  fid uuid;
  antall int;
begin
  for ny in
    select * from (values
      ('copenhell',           'https://www.ticketmaster.dk/event/copenhell-2027-4-day-ticket-tickets/1010238744'),
      ('lollapalooza-berlin', 'https://www.ticketmaster.de/event/lollapalooza-berlin-2027-presented-by-essence-%7C-17-and-18-july-2027-tickets/1956126517'),
      ('way-out-west',        'https://www.ticketmaster.se/event/way-out-west-12-14-augusti-2027-biljetter/545583536')
    ) as v(slug, url)
  loop
    update festival_editions e
       set ticket_url = ny.url, updated_at = now()
      from festivals f
     where f.id = e.festival_id and f.slug = ny.slug and e.year = 2027;
    get diagnostics antall = row_count;
    if antall <> 1 then
      raise exception 'Fant ikke 2027-utgaven til «%» -- ingenting er endret.', ny.slug;
    end if;
  end loop;

  select id into fid from festivals where slug = 'bergenfest';
  if fid is null then
    raise exception 'Fant ikke festivalen «bergenfest» -- ingenting er endret.';
  end if;
  if exists (select 1 from festival_editions where festival_id = fid and year = 2027) then
    raise exception 'Bergenfest har allerede en 2027-utgave -- ingenting er endret.';
  end if;
  insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
  values (fid, 2027, '2027-06-09', '2027-06-12',
          'https://www.ticketmaster.no/event/festivalpass-bergenfest-2027-%7C-onsdag-lordag-billetter/1284992681',
          '[]'::jsonb, 'manual');
end $$;

commit;

select f.name, e.date_from, e.date_to, g.gammel_lenke, e.ticket_url as ny_lenke
  from festival_editions e
  join festivals f on f.id = e.festival_id
  left join gamle_lenker g on g.slug = f.slug
 where e.year = 2027
   and f.slug in ('copenhell', 'lollapalooza-berlin', 'way-out-west', 'bergenfest')
 order by f.name;
