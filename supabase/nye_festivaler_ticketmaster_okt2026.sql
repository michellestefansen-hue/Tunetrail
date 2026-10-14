-- Fem nye festivaler med billetter paa Ticketmaster, oktober 2026.
--
-- Ingen av dem fantes i basen (sjekket paa navn 14.10.2026). Alive, ENGAGE og
-- Festegnen laa i den gamle Ticketmaster-importen (seed_europe.sql), men da
-- med billettypen som navn ("ENGAGE Festival - Partout 18/6 + 19/6") og som
-- mange rader per festival. Her er de lagt inn én gang, med festivalens navn.
--
-- Tagger er satt etter line-up, ikke navn. size_band er bare satt der det
-- finnes et tall aa staa paa; ellers null, saa festivalsiden ikke viser et
-- gjettet tall.
--
-- Fila stopper med en feil, og legger ikke inn noe, hvis en av festivalene
-- allerede finnes (slug er unik) eller hvis ikke alle fem utgavene kommer inn.

begin;

insert into festivals
  (name, slug, website_url, city, venue_name, country, latitude, longitude,
   category, tags, size_band, subgenres, source)
values
  -- Thisted, 29.-31. juli 2027. Line-up 2026: Soleima, Bisse, Eee Gee,
  -- Smag Paa Dig Selv, Ashes of Billy, Inspector Spacetime, John Lindberg Trio
  -- -- dansk indie og pop. Ca. 3 000 gjester (frivilligannonse 2024).
  -- Koordinater: Christiansgave, Tingstrupvej 2, Thisted.
  ('Alive Festival', 'alive-festival', 'https://alivefestival.dk/',
   'Thisted', 'Christiansgave', 'Danmark', 56.9573, 8.68718,
   'Indie', array['Alternativ & Indie','Pop & Mainstream']::text[],
   '2000_10000', null, 'manual'),

  -- Koebenhavn, 18.-19. juni 2027. Line-up 2026: Peter Sommer, Suspekt, TV-2,
  -- Annika Aakjaer, Folkeklubben, Ulige Numre. Arrangeres av Veteranfonden.
  -- Ingen publikumstall funnet.
  ('ENGAGE Festival', 'engage-festival', 'https://engagefestival.dk/',
   'København', 'Kastellet', 'Danmark', 55.6914, 12.5950,
   'Pop & Mainstream', array['Pop & Mainstream','Rock','Hip-Hop & R&B']::text[],
   null, null, 'manual'),

  -- Roedovre, 18.-19. juni 2027. Line-up 2026: Sigala, Scooter, Snap!,
  -- Laidback Luke -- dans og 90-tallsnostalgi. Plass til 30 000 (sn.dk).
  -- Holdes utenfor elektronikaguiden av tagg-regelen (bare halvparten av
  -- taggene er elektroniske), og det er riktig: det er en festfestival.
  ('Festegnen', 'festegnen', 'https://vielsker.dk/',
   'Rødovre', 'Espelunden', 'Danmark', 55.67588, 12.43292,
   'Elektronisk & Dans', array['Elektronisk & Dans','Pop & Mainstream']::text[],
   '10000_50000', null, 'manual'),

  -- Koebenhavn, 5.-7. august 2027. Line-up 2026: Disclosure (DJ-sett),
  -- Overmono, Nia Archives, Jayda G, Yaeji, PinkPantheress. Kommer inn i
  -- elektronikaguiden (to av tre tagger er elektroniske), under house og
  -- drum and bass. Kapasitet oppgitt til 10 000 bare av én kilde -- null.
  -- Koordinater: Refshaleoeen, ikke punktet Soender Hoved (ca. 500 m unna).
  ('O Days', 'o-days', 'https://www.odaysfestival.dk/',
   'København', 'Sønder Hoved, Refshaleøen', 'Danmark', 55.6930, 12.6100,
   'Elektronisk & Dans', array['Elektronisk & Dans','Techno & House','Alternativ & Indie']::text[],
   null, array['house','dnb']::text[], 'manual'),

  -- Tromsoe, 11.-12. juni 2027. Artister 2027 (sommernatt.com): Hagle,
  -- Oslo Ess, TIX, Rotlaus. Romssa Arena (tidl. Alfheim stadion),
  -- Stadionvegen 3. Ingen publikumstall funnet for festivalen.
  ('Sommernatt', 'sommernatt', 'https://www.sommernatt.com/',
   'Tromsø', 'Romssa Arena Park', 'Norge', 69.6489, 18.9344,
   'Pop & Mainstream', array['Pop & Mainstream','Rock']::text[],
   null, null, 'manual');

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select f.id, 2027, v.date_from::date, v.date_to::date, v.ticket_url, '[]'::jsonb, 'manual'
  from (values
    ('alive-festival',  '2027-07-29', '2027-07-31', 'https://www.ticketmaster.dk/event/alive-festival-2027-%7C-partout-29-31-juli-billetter/886551367'),
    ('engage-festival', '2027-06-18', '2027-06-19', 'https://www.ticketmaster.dk/event/150266413'),
    ('festegnen',       '2027-06-18', '2027-06-19', 'https://www.ticketmaster.dk/event/festegnen-18-19-juni-2027-billetter/1895011248'),
    ('o-days',          '2027-08-05', '2027-08-07', 'https://www.ticketmaster.dk/event/o-days-2027-3-days-ticket-billetter/975204076'),
    ('sommernatt',      '2027-06-11', '2027-06-12', 'https://www.ticketmaster.no/event/sommernatt-2027-billetter/104588813')
  ) as v(slug, date_from, date_to, ticket_url)
  join festivals f on f.slug = v.slug;

do $$
begin
  if (select count(*) from festival_editions e
        join festivals f on f.id = e.festival_id
       where e.year = 2027
         and f.slug in ('alive-festival','engage-festival','festegnen','o-days','sommernatt')) <> 5 then
    raise exception 'Fikk ikke inn alle fem 2027-utgavene -- ingenting er lagt inn.';
  end if;
end $$;

commit;

select f.name, f.city, f.category, f.tags, f.size_band, e.date_from, e.date_to, e.ticket_url
  from festivals f
  join festival_editions e on e.festival_id = f.id and e.year = 2027
 where f.slug in ('alive-festival','engage-festival','festegnen','o-days','sommernatt')
 order by e.date_from;
