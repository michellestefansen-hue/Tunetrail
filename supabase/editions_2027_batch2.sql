-- 2027 editions, batch 2: 11 more festivals, all read off their own sites
-- on 2 August 2026. Same reasoning as batch 1 -- these had already run their
-- 2026 edition and so show nothing in the app at all.
--
-- Left out because 2027 dates are not published yet: Let It Roll, Primavera
-- Sound, Electric Castle (says only 'July 2027'), Wacken, Graspop,
-- Gurtenfestival, Down The Rabbit Hole, Beach Please, Gent Jazz,
-- Resurrection Fest, Nova Rock, Bilbao BBK Live, Mad Cool, Bork Festival,
-- We Love Green, Vieilles Charrues, Zurich Openair, Couleur Cafe,
-- FIB Benicassim, Mallorca Live.
--
-- Two ticket links were dropped on purpose: Kappa FuturFestival's shop URL
-- still points at a 2025 event id, and the only Montreux link on offer was a
-- programme page rather than a ticket shop.
--
-- Note on OpenAir St. Gallen: its front page carries both '25.-28. Juni 2026'
-- in the header and '1-4 July 2027' in the main visual with a live ticket
-- link. The 2027 pair is used; worth re-checking once the site is updated.
--
-- Montreux runs 16 days (2-17 July) -- that is correct, it is a long festival.

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select f.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, '[]'::jsonb, 'manual'
from (values
('eurosonic-noorderslag', 2027, '2027-01-13', '2027-01-16', 'https://esns.nl/en/tickets/'),
('pinkpop-festival', 2027, '2027-06-18', '2027-06-20', null),
('tinderbox-festival', 2027, '2027-06-24', '2027-06-26', 'https://shop.tinderbox.dk/'),
('open-er-festival', 2027, '2027-06-30', '2027-07-03', null),
('provinssi', 2027, '2027-07-01', '2027-07-03', 'https://liput.provinssi.fi/f20f4130e7bd49b99eeb38ad7236ccd9'),
('vida-festival', 2027, '2027-07-01', '2027-07-03', 'https://www.vidafestival.com/en/tickets/'),
('openair-st-gallen', 2027, '2027-07-01', '2027-07-04', 'https://www.ticket-onlineshop.com/ols/openairsg/de/festival/channel/shop/areaplan/venue/event/680943'),
('kappa-futurfestival', 2027, '2027-07-02', '2027-07-04', null),
('montreux-jazz-festival', 2027, '2027-07-02', '2027-07-17', null),
('cruilla-barcelona', 2027, '2027-07-07', '2027-07-10', 'https://www.cruillabarcelona.cat/en/tickets/'),
('ruisrock', 2027, '2027-07-09', '2027-07-11', 'https://ruisrock.fi/en/tickets/')
) as v(slug, year, date_from, date_to, ticket_url)
join festivals f on f.slug = v.slug
on conflict (festival_id, year) do nothing;
