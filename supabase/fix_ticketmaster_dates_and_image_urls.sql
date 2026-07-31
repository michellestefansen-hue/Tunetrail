-- Two data fixes.
--
-- 1) Ticketmaster-imported editions took their dates from a single ticket
--    listing rather than the festival's actual run, collapsing multi-day
--    festivals to one or two days. Where only a future stub edition exists it
--    also shadows a richer past edition on the guide pages. Corrected dates
--    below were each verified against the festival's own site/listing.
--
--    Canal Street 2027 is self-evidencing: its own ticket URL reads
--    ".../canal-street-|-festivalpass-2027-28-30juli-..." while the stored
--    range was a single day, 30 July.

update festival_editions e set date_from = '2026-07-10', date_to = '2026-07-18'
  from festivals f where f.id = e.festival_id and f.slug = 'pori-jazz' and e.year = 2026;
update festival_editions e set date_from = '2027-07-15', date_to = '2027-07-17'
  from festivals f where f.id = e.festival_id and f.slug = 'pori-jazz' and e.year = 2027;

update festival_editions e set date_from = '2026-07-17', date_to = '2026-07-19'
  from festivals f where f.id = e.festival_id and f.slug = 'ilosaarirock' and e.year = 2026;
update festival_editions e set date_from = '2027-07-16', date_to = '2027-07-18'
  from festivals f where f.id = e.festival_id and f.slug = 'ilosaarirock' and e.year = 2027;

update festival_editions e set date_from = '2027-07-28', date_to = '2027-07-30'
  from festivals f where f.id = e.festival_id and f.slug = 'canal-street' and e.year = 2027;

update festival_editions e set date_from = '2027-07-10', date_to = '2027-07-11'
  from festivals f where f.id = e.festival_id and f.slug = 'parklife-festival' and e.year = 2027;

-- Venue names confirmed while checking the dates above.
update festivals set venue_name = 'Kirjurinluoto' where slug = 'pori-jazz' and venue_name is null;
update festivals set venue_name = 'Laulurinne'    where slug = 'ilosaarirock' and venue_name is null;

-- 2) 313 of the 518 festival images are stored as http://. The site is served
--    over https, so these are mixed content: browsers either block them or
--    silently auto-upgrade, which makes the images fragile and slow. Every
--    host involved serves the same file over https (spot-checked against
--    commons.wikimedia.org, which is 302 of the 313).
update festivals
set image_url = 'https://' || substring(image_url from 8)
where image_url like 'http://%';
