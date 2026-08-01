-- 2027 editions for 18 of the biggest festivals in the database.
--
-- Why this matters more than it looks: as of 2 August 2026 only 20 of 692
-- festivals had anything upcoming beyond this autumn. 310 are live today,
-- 110 a month from now, 24 by Christmas -- the app empties itself out.
-- Every festival here already ran its 2026 edition, so it currently shows
-- nothing at all, including household names like Roskilde and Hellfest.
--
-- image_url, tags, coordinates, venue and website live on `festivals`, not
-- on the edition, so adding a 2027 row brings each festival back complete --
-- 17 of these 18 already have an image stored.
--
-- Every date below was read off the festival's own site on 2 August 2026.
-- Festivals whose 2027 dates were not yet published (Wacken, Graspop,
-- Resurrection Fest, Nova Rock, Gurtenfestival, Down The Rabbit Hole,
-- Electric Castle) are deliberately left out rather than guessed at -- in
-- Nova Rock's case the only clue was a hotel package's check-in date.
--
-- program is an empty array: the column is NOT NULL and no 2027 line-up
-- is announced yet.

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select f.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, '[]'::jsonb, 'manual'
from (values
('roskilde-festival', 2027, '2027-06-26', '2027-07-03', 'https://ticket.roskilde-festival.dk/en/p2muh1c6jz61zhd/products'),
('hellfest', 2027, '2027-06-17', '2027-06-20', 'https://tickets.hellfest.fr/en/index.html'),
('rock-werchter', 2027, '2027-07-01', '2027-07-04', null),
('copenhell', 2027, '2027-06-23', '2027-06-26', 'https://copenhell.dk/en/tickets/'),
('dour-festival', 2027, '2027-07-07', '2027-07-11', 'https://tickets.dourfestival.eu/a27235ecf3cc4a379f307a1a25da8952/offsale'),
('north-sea-jazz', 2027, '2027-07-09', '2027-07-11', 'https://www.northseajazz.com/en/tickets'),
('parookaville', 2027, '2027-07-16', '2027-07-18', 'https://q.ticketpay.de/Fpr6tson-Yjw60RseKPab'),
('defqon-1-festival', 2027, '2027-06-24', '2027-06-27', null),
('les-ardentes', 2027, '2027-07-01', '2027-07-04', null),
('paleo-festival', 2027, '2027-07-19', '2027-07-25', 'https://www.paleo.ch/fr/billetterie'),
('airbeat-one', 2027, '2027-07-07', '2027-07-11', 'https://airbeat-one.myticket.de/content'),
('sweden-rock-festival', 2027, '2027-06-09', '2027-06-12', 'https://swedenrock.com/en/'),
('roadburn-festival', 2027, '2027-04-15', '2027-04-18', 'https://tickets.roadburn.com/114b6d36a3cc40d0874b7b33e45934c7/offsale'),
('best-kept-secret', 2027, '2027-06-11', '2027-06-13', 'https://www.bestkeptsecret.nl/tickets'),
('pohoda', 2027, '2027-07-08', '2027-07-10', 'https://shop.pohodafestival.sk/en/tickets-2027'),
('deichbrand', 2027, '2027-07-15', '2027-07-18', 'https://www.ticket-onlineshop.com/ols/deichbrand/'),
('latitude-festival', 2027, '2027-07-22', '2027-07-25', 'https://www.latitudefestival.com/tickets/'),
('ultra-europe', 2027, '2027-07-09', '2027-07-11', 'https://ultraeurope.com/tickets/')
) as v(slug, year, date_from, date_to, ticket_url)
join festivals f on f.slug = v.slug
on conflict (festival_id, year) do nothing;
