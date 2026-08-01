-- Insert 25 new festivals from Spain/Italy/Portugal not previously in the database.
-- Source file has no per-artist lineup, only day-range calendars -- program left null.
insert into festivals (name, slug, website_url, city, venue_name, country, latitude, longitude, tags, source)
values
('Quincena Musical de San Sebastián', 'quincena-musical-de-san-sebastian', 'https://www.quincenamusical.eus/en/', 'San Sebastián', 'Kursaal og flere arenaer', 'Spania', 43.3267, -1.9778, array['Klassisk']::text[], 'manual'),
('Festival Internacional de Santander', 'festival-internacional-de-santander', 'https://festivalsantander.com/', 'Santander', 'Palacio de Festivales og arenaer i Cantabria', 'Spania', 43.4603, -3.8074, array['Klassisk','Folk & Americana']::text[], 'manual'),
('Sonorama Ribera', 'sonorama-ribera', 'https://www.sonorama-aranda.com/', 'Aranda de Duero', 'Recinto Ferial', 'Spania', 41.675, -3.689, array['Alternativ & Indie','Pop & Mainstream','Rock','Hip-Hop & R&B','Elektronisk & Dans']::text[], 'manual'),
('Leyendas del Rock', 'leyendas-del-rock', 'https://www.leyendasdelrockfestival.com/', 'Villena', 'Polideportivo Municipal de Villena', 'Spania', 38.6351, -0.8656, array['Metal','Rock','Punk & Hardcore']::text[], 'manual'),
('Rototom Sunsplash', 'rototom-sunsplash', 'https://rototomsunsplash.com/en/', 'Benicàssim', 'Recinto de Festivales de Benicàssim', 'Spania', 40.0556, 0.0732, array['Verden & Reggae','Hip-Hop & R&B','Soul & Funk','Elektronisk & Dans']::text[], 'manual'),
('Ebrovisión', 'ebrovision', 'https://ebrovision.com/', 'Miranda de Ebro', 'Flere arenaer i Miranda de Ebro', 'Spania', 42.6865, -2.947, array['Alternativ & Indie','Rock','Pop & Mainstream','Punk & Hardcore']::text[], 'manual'),
('Granada Sound', 'granada-sound', 'https://granadasound.com/', 'Granada', 'Cortijo del Conde', 'Spania', 37.2302, -3.6249, array['Alternativ & Indie','Pop & Mainstream','Rock','Elektronisk & Dans']::text[], 'manual'),
('Monkey Week', 'monkey-week', 'https://monkeyweek.org/en/', 'Sevilla', 'Flere arenaer i Sevilla', 'Spania', 37.3993, -5.9945, array['Alternativ & Indie','Rock','Pop & Mainstream','Hip-Hop & R&B','Elektronisk & Dans','Punk & Hardcore']::text[], 'manual'),
('SonicBlast Fest', 'sonicblast-fest', 'https://sonicblastfestival.com/', 'Vila Praia de Âncora', 'Duna dos Caldeirões', 'Portugal', 41.8109, -8.8619, array['Rock','Metal','Punk & Hardcore','Alternativ & Indie']::text[], 'manual'),
('ANTIPOP / NEOPOP Festival', 'antipop-neopop-festival', 'https://www.neopopfestival.com/', 'Viana do Castelo', 'Forte de Santiago da Barra', 'Portugal', 41.6969, -8.8362, array['Techno & House','Elektronisk & Dans']::text[], 'manual'),
('MEO Monte Verde', 'meo-monte-verde', 'https://meomonteverde.com/', 'Ribeira Grande, São Miguel', 'Parque de Campismo do Monte Verde', 'Portugal', 37.8237, -25.525, array['Pop & Mainstream','Hip-Hop & R&B','Elektronisk & Dans','Rock']::text[], 'manual'),
('Vodafone Paredes de Coura', 'vodafone-paredes-de-coura', 'https://www.paredesdecoura.com/', 'Paredes de Coura', 'Praia Fluvial do Taboão', 'Portugal', 41.9108, -8.5654, array['Alternativ & Indie','Rock','Elektronisk & Dans','Hip-Hop & R&B','Folk & Americana']::text[], 'manual'),
('CA Vilar de Mouros', 'ca-vilar-de-mouros', 'https://www.festivalvilardemouros.pt/', 'Vilar de Mouros', 'Recinto do Festival de Vilar de Mouros', 'Portugal', 41.8817, -8.7904, array['Rock','Alternativ & Indie','Metal','Punk & Hardcore','Soul & Funk']::text[], 'manual'),
('Festival F', 'festival-f', 'https://www.festivalf.pt/', 'Faro', 'Vila-Adentro / gamlebyen', 'Portugal', 37.0129, -7.9345, array['Pop & Mainstream','Hip-Hop & R&B','Rock','Folk & Americana','Verden & Reggae']::text[], 'manual'),
('Festival Iminente', 'festival-iminente', 'https://festivaliminente.com/', 'Lisboa', 'Marvila', 'Portugal', 38.7447, -9.103, array['Hip-Hop & R&B','Elektronisk & Dans','Verden & Reggae','Pop & Mainstream','Folk & Americana']::text[], 'manual'),
('OUT.FEST', 'out-fest', 'https://outfest.pt/eng/', 'Barreiro', 'Flere arenaer i Barreiro', 'Portugal', 38.6631, -9.0724, array['Alternativ & Indie','Elektronisk & Dans','Jazz','Klassisk','Metal','Folk & Americana']::text[], 'manual'),
('Ypsigrock Festival', 'ypsigrock-festival', 'https://www.ypsigrock.it/en/', 'Castelbuono', 'Castello dei Ventimiglia og flere arenaer', 'Italia', 37.9339, 14.0876, array['Alternativ & Indie','Rock','Pop & Mainstream','Elektronisk & Dans']::text[], 'manual'),
('Red Valley Festival', 'red-valley-festival', 'https://redvalleyfestival.com/', 'Olbia', 'Olbia Arena', 'Italia', 40.925, 9.4955, array['Pop & Mainstream','Hip-Hop & R&B','Elektronisk & Dans']::text[], 'manual'),
('Ariano FolkFestival', 'ariano-folkfestival', 'https://www.arianofolkfestival.it/', 'Ariano Irpino', 'Centro storico / Folkstage', 'Italia', 41.1511, 15.0904, array['Verden & Reggae','Folk & Americana','Soul & Funk','Jazz','Elektronisk & Dans']::text[], 'manual'),
('La Notte della Taranta – Concertone', 'la-notte-della-taranta-concertone', 'https://www.lanottedellataranta.it/en/', 'Melpignano', 'Piazzale ex Convento degli Agostiniani', 'Italia', 40.155, 18.2917, array['Folk & Americana','Verden & Reggae','Pop & Mainstream']::text[], 'manual'),
('AMA Music Festival', 'ama-music-festival', 'https://amamusicfestival.com/?lang=en', 'Romano d''Ezzelino', 'Villa Ca'' Cornaro', 'Italia', 45.7894, 11.7569, array['Rock','Alternativ & Indie','Pop & Mainstream','Punk & Hardcore','Elektronisk & Dans']::text[], 'manual'),
('Ferrara Buskers Festival', 'ferrara-buskers-festival', 'https://www.ferrarabuskers.com/en', 'Ferrara', 'Historisk sentrum', 'Italia', 44.8354, 11.6198, array['Folk & Americana','Verden & Reggae','Jazz','Blues','Rock','Pop & Mainstream']::text[], 'manual'),
('Decibel Open Air', 'decibel-open-air', 'https://www.decibelopenair.com/', 'Firenze', 'Parco delle Cascine / festivalområdet', 'Italia', 43.7806, 11.2173, array['Techno & House','Elektronisk & Dans']::text[], 'manual'),
('Poplar Festival', 'poplar-festival', 'https://poplarfestival.it/en/poplar26', 'Trento', 'Doss Trento', 'Italia', 46.0757, 11.1179, array['Alternativ & Indie','Pop & Mainstream','Hip-Hop & R&B','Elektronisk & Dans','Rock']::text[], 'manual'),
('C2C Festival', 'c2c-festival', 'https://clubtoclub.it/', 'Torino', 'Lingotto Fiere og flere arenaer', 'Italia', 45.0323, 7.666, array['Elektronisk & Dans','Alternativ & Indie','Techno & House','Hip-Hop & R&B','Pop & Mainstream']::text[], 'manual')
on conflict (slug) do nothing;

insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, source)
select fest.id, v.year, v.date_from::date, v.date_to::date, v.ticket_url, 'manual'
from (values
('quincena-musical-de-san-sebastian', 2026, '2026-08-02', '2026-08-30', 'https://tickets.quincenamusical.eus/list/events?lang=en'),
('festival-internacional-de-santander', 2026, '2026-08-02', '2026-08-31', 'https://festivalsantander.com/calendario-y-venta-de-entradas-2026/'),
('sonorama-ribera', 2026, '2026-08-05', '2026-08-09', 'https://sonorama-aranda.com/entradas/'),
('leyendas-del-rock', 2026, '2026-08-05', '2026-08-08', 'https://www.leyendasdelrockfestival.com/tickets/'),
('rototom-sunsplash', 2026, '2026-08-16', '2026-08-22', 'https://tickets.rototomsunsplash.com/'),
('ebrovision', 2026, '2026-09-03', '2026-09-06', 'https://ebrovision.com/'),
('granada-sound', 2026, '2026-09-11', '2026-09-12', 'https://granadasound.com/comprar/'),
('monkey-week', 2026, '2026-11-20', '2026-11-22', 'https://monkeyweek.org/en/'),
('sonicblast-fest', 2026, '2026-08-05', '2026-08-08', 'https://sonicblastfestival.com/tickets/'),
('antipop-neopop-festival', 2026, '2026-08-06', '2026-08-08', 'https://www.neopopfestival.com/'),
('meo-monte-verde', 2026, '2026-08-06', '2026-08-08', 'https://meomonteverde.bol.pt/'),
('vodafone-paredes-de-coura', 2026, '2026-08-12', '2026-08-15', 'https://www.paredesdecoura.com/'),
('ca-vilar-de-mouros', 2026, '2026-08-18', '2026-08-22', 'https://www.bol.pt/Comprar/Bilhetes/175938-festival_ca_vilar_de_mouros_2026-vilar_de_mouros/'),
('festival-f', 2026, '2026-09-03', '2026-09-05', 'https://www.festivalf.pt/pt/menu/1932/informacoes-uteis.aspx'),
('festival-iminente', 2026, '2026-09-17', '2026-09-20', 'https://festivaliminente.com/'),
('out-fest', 2026, '2026-10-01', '2026-10-04', 'https://outfest.pt/eng/bilhetes/'),
('ypsigrock-festival', 2026, '2026-08-06', '2026-08-09', 'https://www.ypsigrock.it/en/information/'),
('red-valley-festival', 2026, '2026-08-13', '2026-08-15', 'https://redvalleyfestival.com/#tickets'),
('ariano-folkfestival', 2026, '2026-08-20', '2026-08-23', 'https://www.arianofolkfestival.it/'),
('la-notte-della-taranta-concertone', 2026, '2026-08-22', '2026-08-22', 'https://www.lanottedellataranta.it/en/'),
('ama-music-festival', 2026, '2026-08-23', '2026-08-30', 'https://amamusicfestival.com/tickets/?lang=en'),
('ferrara-buskers-festival', 2026, '2026-08-26', '2026-08-30', 'https://www.ferrarabuskers.com/en/BIGLIETTI'),
('decibel-open-air', 2026, '2026-09-04', '2026-09-06', 'https://www.ticketmaster.it/artist/decibel-open-air-tickets/1044582?language=en-us'),
('poplar-festival', 2026, '2026-09-10', '2026-09-13', 'https://poplarfestival.it/en/poplar26'),
('c2c-festival', 2026, '2026-10-29', '2026-11-01', 'https://clubtoclub.it/event/c2c-festival-2026/')
) as v(slug, year, date_from, date_to, ticket_url)
join festivals fest on fest.slug = v.slug
on conflict (festival_id, year) do nothing;
