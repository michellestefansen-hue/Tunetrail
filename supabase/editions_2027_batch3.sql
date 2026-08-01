-- 2027 editions, batch 3: 12 more, all read off the festivals' own sites
-- on 2 August 2026. Brings the three batches to 41 revived festivals.
--
-- Rock am Ring and Rock im Park share dates (4-6 June) because they are the
-- same event run at two sites -- that is correct, not a copy-paste slip.
--
-- Les Eurockeennes is the one indirect read: the site says only 'Rendez-vous
-- en 2027' in body text, but a link on the same page is titled 'les 1-2-3-et
-- 4-juillet 2027'. Worth re-checking when they publish properly.
--
-- Still unannounced and therefore skipped: INmusic, Main Square, Qstock,
-- Nummirock, LaSemo, Bilbao BBK Live, Mad Cool, FIB Benicassim, Bork,
-- Vieilles Charrues, Couleur Cafe, Zurich Openair, We Love Green.

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select f.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, '[]'::jsonb, 'manual'
from (values
('rock-am-ring', 2027, '2027-06-04', '2027-06-06', 'https://rock-am-ring.com/tickets'),
('rock-im-park', 2027, '2027-06-04', '2027-06-06', 'https://rockimpark2027.eventportal.io/'),
('northside-festival', 2027, '2027-06-10', '2027-06-12', 'https://shop.northside.dk'),
('greenfield-festival', 2027, '2027-06-10', '2027-06-12', 'https://greenfieldfestival.ch/tickets'),
('festi-neuch', 2027, '2027-06-10', '2027-06-13', 'https://festineuch.ch/billetterie/'),
('mallorca-live-festival', 2027, '2027-06-11', '2027-06-12', 'https://shop.paylogic.com/18118ab150e24b14ac2d83700f96f983/mallorca-live-occident-2027'),
('les-eurockeennes', 2027, '2027-07-01', '2027-07-04', null),
('slottsfjellfestivalen', 2027, '2027-07-02', '2027-07-03', 'https://www.slottsfjell.no/billetter/'),
('musilac', 2027, '2027-07-08', '2027-07-11', 'https://www.musilac.com/billetterie-2027'),
('awakenings-festival', 2027, '2027-07-09', '2027-07-11', 'https://www.awakenings.com/en/events/2027/07/awakenings-festival-2027/399344/'),
('bospop', 2027, '2027-07-09', '2027-07-11', null),
('lollapalooza-berlin', 2027, '2027-07-17', '2027-07-18', 'https://www.lollapaloozade.com/tickets')
) as v(slug, year, date_from, date_to, ticket_url)
join festivals f on f.slug = v.slug
on conflict (festival_id, year) do nothing;
