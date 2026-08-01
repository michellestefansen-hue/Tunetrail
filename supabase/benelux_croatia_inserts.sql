-- Insert 21 new festivals in Belgium, the Netherlands and Croatia.
-- Alcatraz Open Air is NOT here: it is the same event as the stored
-- 'Alcatraz Metal Festival' (same dates, site and ticket link), so it is
-- merged in benelux_croatia_updates.sql instead of duplicated.
-- This source has no lineup, so program is an empty array (NOT NULL column).
insert into festivals (name, slug, website_url, city, venue_name, country, latitude, longitude, tags, source)
values
('Maanrock', 'maanrock', 'https://www.maanrock.be/', 'Mechelen', 'Grote Markt og flere scener i sentrum', 'Belgia', 51.0289, 4.48, array['Pop & Mainstream','Rock','Alternativ & Indie','Elektronisk & Dans','Hip-Hop & R&B']::text[], 'manual'),
('P&V Bomboclat Festival', 'pv-bomboclat-festival', 'https://bomboclat.be/', 'Zeebrugge', 'Strand van Zeebrugge', 'Belgia', 51.3388, 3.2023, array['Verden & Reggae','Hip-Hop & R&B','Elektronisk & Dans']::text[], 'manual'),
('Crammerock', 'crammerock', 'https://www.crammerock.be/', 'Stekene', 'Festivalterrein Stekene', 'Belgia', 51.2087, 4.0405, array['Rock','Alternativ & Indie','Pop & Mainstream','Elektronisk & Dans','Hip-Hop & R&B']::text[], 'manual'),
('Flanders Festival Ghent', 'flanders-festival-ghent', 'https://www.gentfestival.be/en/', 'Gent', 'Flere konsertsaler og historiske arenaer i Gent', 'Belgia', 51.0538, 3.7273, array['Klassisk','Jazz','Verden & Reggae']::text[], 'manual'),
('Desertfest Belgium', 'desertfest-belgium', 'https://www.desertfest.be/', 'Liège', 'OM og tilknyttede scener i Liège-området', 'Belgia', 50.6326, 5.5797, array['Rock','Metal','Alternativ & Indie']::text[], 'manual'),
('Sonic City', 'sonic-city', 'https://www.wildewesten.be/nl/event/sonic-city-2026', 'Kortrijk', 'Depart / Wilde Westen', 'Belgia', 50.826, 3.264, array['Alternativ & Indie','Rock','Elektronisk & Dans']::text[], 'manual'),
('Grachtenfestival', 'grachtenfestival', 'https://www.grachtenfestival.nl/', 'Amsterdam', 'Kanaler, kirker og konsertsaler i Amsterdam', 'Nederland', 52.3676, 4.9041, array['Klassisk','Jazz']::text[], 'manual'),
('Into The Great Wide Open', 'into-the-great-wide-open', 'https://intothegreatwideopen.nl/en/', 'Vlieland', 'Flere natur- og kulturscener på Vlieland', 'Nederland', 53.2964, 5.0669, array['Alternativ & Indie','Rock','Pop & Mainstream','Elektronisk & Dans','Folk & Americana','Verden & Reggae']::text[], 'manual'),
('Decibel Outdoor', 'decibel-outdoor', 'https://www.b2s.nl/en/events/decibel/', 'Hilvarenbeek', 'Beekse Bergen', 'Nederland', 51.5219, 5.1224, array['Elektronisk & Dans','Techno & House']::text[], 'manual'),
('Baroeg Open Air', 'baroeg-open-air', 'https://baroeg.nl/productie/baroeg-open-air-2026-2/', 'Rotterdam', 'Zuiderpark', 'Nederland', 51.8846, 4.492, array['Metal','Rock','Punk & Hardcore','Elektronisk & Dans','Hip-Hop & R&B']::text[], 'manual'),
('Left of the Dial', 'left-of-the-dial', 'https://leftofthedial.nl/', 'Rotterdam', '25+ konsertsteder i Rotterdam sentrum', 'Nederland', 51.9225, 4.4792, array['Alternativ & Indie','Rock','Punk & Hardcore']::text[], 'manual'),
('Amsterdam Dance Event', 'amsterdam-dance-event', 'https://www.amsterdam-dance-event.nl/', 'Amsterdam', '300+ klubber, saler og kulturarenaer', 'Nederland', 52.3676, 4.9041, array['Elektronisk & Dans','Techno & House','Hip-Hop & R&B']::text[], 'manual'),
('Le Guess Who?', 'le-guess-who', 'https://leguesswho.com/', 'Utrecht', 'TivoliVredenburg og flere arenaer i Utrecht', 'Nederland', 52.0924, 5.113, array['Alternativ & Indie','Elektronisk & Dans','Jazz','Verden & Reggae','Hip-Hop & R&B','Folk & Americana']::text[], 'manual'),
('Super-Sonic Jazz Festival', 'super-sonic-jazz-festival', 'https://www.supersonicjazz.nl/festival', 'Amsterdam', 'Paradiso', 'Nederland', 52.3622, 4.8839, array['Jazz','Soul & Funk','Hip-Hop & R&B','Elektronisk & Dans']::text[], 'manual'),
('Mo:Dem Festival', 'mo-dem-festival', 'https://modemfestival.com/modem-festival-2026/', 'Donje Primišlje / Slunj', 'Mo:Dem Festival site', 'Kroatia', 45.1265, 15.4469, array['Elektronisk & Dans','Techno & House']::text[], 'manual'),
('Balance Croatia', 'balance-croatia', 'https://www.balancecroatia.com/', 'Tisno', 'The Garden Resort', 'Kroatia', 43.8049, 15.666, array['Elektronisk & Dans','Techno & House']::text[], 'manual'),
('Night Horizon Festival', 'night-horizon-festival', 'https://nighthorizonfestival.com/', 'Novalja / Zrće', 'LIFT Beach Club, Zrće Bay', 'Kroatia', 44.5417, 14.8905, array['Elektronisk & Dans','Techno & House','Pop & Mainstream']::text[], 'manual'),
('Špancirfest', 'spancirfest', 'https://www.spancirfest.com/en/', 'Varaždin', 'Gamlebyen, torg og flere utendørsscener', 'Kroatia', 46.3057, 16.3366, array['Pop & Mainstream','Rock','Folk & Americana','Verden & Reggae','Jazz']::text[], 'manual'),
('Hoomstock', 'hoomstock', 'https://core-event.co/en/events/hoomstock-2026-8c19/', 'Hum na Sutli', 'Hoomstock festivalområde', 'Kroatia', 46.2131, 15.6876, array['Rock','Punk & Hardcore','Alternativ & Indie']::text[], 'manual'),
('Dimensions Festival', 'dimensions-festival', 'https://dimensionsfestival.com/', 'Tisno', 'The Garden Resort', 'Kroatia', 43.8049, 15.666, array['Elektronisk & Dans','Techno & House','Hip-Hop & R&B','Soul & Funk']::text[], 'manual'),
('Goulash Disko Festival', 'goulash-disko-festival', 'https://www.goulashdisko.com/music', 'Komiža, Vis', 'Kamenice Beach og arenaer i Komiža', 'Kroatia', 43.043, 16.0936, array['Verden & Reggae','Elektronisk & Dans','Folk & Americana','Soul & Funk','Hip-Hop & R&B']::text[], 'manual')
on conflict (slug) do nothing;

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select fest.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, '[]'::jsonb, 'manual'
from (values
('maanrock', 2026, '2026-08-27', '2026-08-30', null),
('pv-bomboclat-festival', 2026, '2026-08-28', '2026-08-29', 'https://www.eventim.be/en/artist/bomboclat-festival/'),
('crammerock', 2026, '2026-09-04', '2026-09-05', 'https://www.crammerock.be/'),
('flanders-festival-ghent', 2026, '2026-09-10', '2026-09-27', 'https://www.ticketsgent.be/organisatie/gent-festival-van-vlaanderen'),
('desertfest-belgium', 2026, '2026-10-16', '2026-10-18', 'https://desertfest.be/information/ticketing'),
('sonic-city', 2026, '2026-11-06', '2026-11-08', 'https://ticketshop.ticketmatic.com/wilde_westen/sonic-city'),
('grachtenfestival', 2026, '2026-08-07', '2026-08-16', 'https://www.grachtenfestival.nl/programma-en-tickets'),
('into-the-great-wide-open', 2026, '2026-08-27', '2026-08-30', 'https://intothegreatwideopen.nl/en/tickets'),
('decibel-outdoor', 2026, '2026-08-28', '2026-08-30', 'https://www.b2s.nl/en/events/decibel/'),
('baroeg-open-air', 2026, '2026-09-11', '2026-09-12', 'https://baroeg.nl/productie/baroeg-open-air-2026-2/'),
('left-of-the-dial', 2026, '2026-10-21', '2026-10-24', 'https://leftofthedial.nl/'),
('amsterdam-dance-event', 2026, '2026-10-21', '2026-10-25', 'https://www.amsterdam-dance-event.nl/en/tickets/'),
('le-guess-who', 2026, '2026-11-05', '2026-11-08', 'https://leguesswho.com/tickets'),
('super-sonic-jazz-festival', 2026, '2026-11-20', '2026-11-22', 'https://www.supersonicjazz.nl/festival'),
('mo-dem-festival', 2026, '2026-08-03', '2026-08-09', 'https://shop.modemfestival.com/'),
('balance-croatia', 2026, '2026-08-06', '2026-08-10', 'https://www.balancecroatia.com/'),
('night-horizon-festival', 2026, '2026-08-16', '2026-08-21', 'https://nighthorizonfestival.com/'),
('spancirfest', 2026, '2026-08-21', '2026-08-30', 'https://www.spancirfest.com/en/'),
('hoomstock', 2026, '2026-08-22', '2026-08-22', 'https://core-event.co/en/events/hoomstock-2026-8c19/'),
('dimensions-festival', 2026, '2026-08-27', '2026-08-31', 'https://dimensionsfestival.com/tickets/'),
('goulash-disko-festival', 2026, '2026-09-18', '2026-09-22', null)
) as v(slug, year, date_from, date_to, ticket_url)
join festivals fest on fest.slug = v.slug
on conflict (festival_id, year) do nothing;
