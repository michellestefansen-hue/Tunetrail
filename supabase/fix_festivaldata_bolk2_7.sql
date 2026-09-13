-- Feil i festivaldata funnet under publikumsresearchen for bolk 2-7,
-- 2026-09-13. Ingen sletting -- alt er oppdateringer.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- === Bestival -> Camp Bestival ===
--
-- Bestival gikk konkurs hoesten 2018 og ble aldri arrangert igjen. Raden her
-- er likevel ikke doed: den har en 2026-utgave fra 30. juli med 129 artister,
-- og koordinatene peker paa Lulworth i Dorset.
--
-- Det er Camp Bestival. Camp Bestival Dorset 2026 gikk 30. juli - 2. august
-- paa Lulworth Castle, som er noeyaktig datoen i basen. Programmet som ligger
-- her tilhoerer altsaa Camp Bestival og er hentet inn under feil navn.
-- Kilde: festivalcalendar.uk, lulworth.com
update festivals
   set name = 'Camp Bestival',
       slug = 'camp-bestival',
       venue_name = 'Lulworth Castle',
       website_url = 'https://dorset.campbestival.net/'
 where slug = 'bestival';

-- === Monkey Week flyttet tilbake til El Puerto de Santa Maria ===
--
-- Festivalen ble grunnlagt i El Puerto de Santa Maria, laa noen aar i
-- Sevilla, og flyttet tilbake fra 2025-utgaven. Basen sto fortsatt paa
-- Sevilla, med koordinater midt i Sevilla sentrum -- 90 km feil.
-- Kilde: laguiago.com
update festivals
   set city = 'El Puerto de Santa María',
       venue_name = 'Flere arenaer i El Puerto de Santa María',
       latitude = 36.60040,
       longitude = -6.22527
 where slug = 'monkey-week';

-- === To rader manglet by, men hadde riktige koordinater ===
--
-- Begge er hentet ved omvendt oppslag paa festivalens egne koordinater.

-- Poulpaphone: arrangeres av Communaute d'agglomeration du Boulonnais,
-- ikke i La Rochelle som den lett forveksles med.
update festivals
   set city = 'Boulogne-sur-Mer'
 where slug = 'poulpaphone'
   and city is null;

-- Festival des arts sonnes: ca. 10 km fra Dinan, ikke i Charente.
update festivals
   set city = 'Saint-André-des-Eaux'
 where slug = 'festival-des-arts-sonnes'
   and city is null;

commit;

-- Kontroll.
select name, slug, city, venue_name, latitude, longitude
  from festivals
 where slug in ('camp-bestival', 'monkey-week', 'poulpaphone',
                'festival-des-arts-sonnes')
 order by name;
