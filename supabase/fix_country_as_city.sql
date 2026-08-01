-- 12 rows carried a country name in the city column ('Hellfest, France'),
-- and since the app renders venue_name ?? city and these have no venue,
-- they showed up as 'France, Frankrike'.
-- The real city comes from reverse-geocoding each row's own stored
-- coordinates via OpenStreetMap Nominatim, which also confirmed every
-- one of those coordinates is correct (Hellfest -> Clisson, Sziget ->
-- Budapest, Solidays -> Paris).
update festivals f set city = v.city
from (values
('europavox', 'Clermont-Ferrand'),
('festival-musique-action', 'Vandœuvre-lès-Nancy'),
('festival-terres-du-son', 'Monts'),
('hellfest', 'Clisson'),
('les-nuits-d-istres', 'Istres'),
('mayday-festival', 'Talence'),
('metal-ride-fest', 'Nancy'),
('musicalarue', 'Luxey'),
('rio-loco', 'Toulouse'),
('solidays', 'Paris'),
('sziget-festival', 'Budapest'),
('tempo-latino', 'Vic-Fezensac')
) as v(slug, city)
where f.slug = v.slug;
