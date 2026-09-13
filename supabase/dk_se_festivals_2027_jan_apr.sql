-- Sju festivaler i Danmark og Sverige, januar-april 2027, fra brukerens
-- research-CSV. Ingen kolliderte med noe i basen (sjekket navn og slug).
-- Publikumsstorrelse er hentet fra kildens eget 'approx_audience'-anslag,
-- ikke gjettet ut fra beskrivelsen slik forrige runde matte gjore.
-- Bilder utelatt: kildens 'image_link' peker pa festivalenes egne sider.

-- ============================================================
-- Nye festivaler (7 stk)
-- ============================================================

-- Folkets Festival  (kilde: Approx. 1,500–2,300 peak capacity -- Capacity-based estimate. Saturday uses Store VEGA, Lille VEGA and Idea)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Folkets Festival', 'folkets-festival', 'Danmark', 'Copenhagen', 'VEGA',
    'https://www.folketsfestival.com/',
    'A participatory Nordic folk festival curated by Dreamers'' Circus, filling Copenhagen''s VEGA with concerts, dancing, jams, talks and spontaneous musical encounters. The format feels more like a shared winter gathering than a conventional showcase festival.',
    'Folk & Americana',
    ARRAY['Folk & Americana']::text[],
    '200_2000',
    55.667996, 12.544246, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-01-15', '2027-01-16', 'https://vega.dk/en/event/folkets-festival-2027-2027-01-16',
  '[{"date": "2027-01-16", "day_label": null, "artists": [{"name": "Stundom", "stage": null, "time": null}, {"name": "Valkyrien Allstars", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Winterwaves  (kilde: Approx. 400–550 max across rooms -- Capacity-based. Musikens Hus main room holds about 400 and the seconda)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Winterwaves', 'winterwaves', 'Sverige', 'Göteborg', 'Musikens Hus',
    'https://www.winterwaves.se/',
    'A one-night dark electronic boutique festival in Gothenburg, using two floors of Musikens Hus for synthpop, darkwave, EBM and post-punk. The compact venue and international bookings make it one of the strongest small-format winter finds in Sweden.',
    'Elektronisk & Dans',
    ARRAY['Elektronisk & Dans']::text[],
    '200_2000',
    57.6978577, 11.9308009, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-01-16', '2027-01-16', 'https://www.tickster.com/se/sv/events/cz03rvyec4ru9v8/2027-01-16/winterwaves-2027',
  '[{"date": "2027-01-16", "day_label": null, "artists": [{"name": "Ash Code", "stage": null, "time": null}, {"name": "Coppia", "stage": null, "time": null}, {"name": "Empathy Test", "stage": null, "time": null}, {"name": "Kommission Z80", "stage": null, "time": null}, {"name": "NNHMN", "stage": null, "time": null}, {"name": "Nox Moderna", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Rocknytt Indoor  (kilde: Up to approx. 1,300 -- Based on Trädgår'n standing concert capacity; actual 2027 attendance i)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Rocknytt Indoor', 'rocknytt-indoor', 'Sverige', 'Göteborg', 'Trädgår''n',
    'https://a-star.se/rocknytt-indoor-2027/',
    'A compact one-day indoor hard-rock and heavy-metal festival in central Gothenburg. Its 2027 edition is built around exclusive moments, including Geoff Tate performing Operation: Mindcrime in full for the final time, alongside a strong Scandinavian and European metal bill.',
    'Metal',
    ARRAY['Metal','Rock']::text[],
    '200_2000',
    57.7044398, 11.9757351, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-01-30', '2027-01-30', 'https://a-star.se/rocknytt-indoor-2027/',
  '[{"date": "2027-01-30", "day_label": null, "artists": [{"name": "Bullet", "stage": null, "time": null}, {"name": "Civil War", "stage": null, "time": null}, {"name": "Crystal Ball", "stage": null, "time": null}, {"name": "Geoff Tate", "stage": null, "time": null}, {"name": "Rocknytt Awards 2027", "stage": null, "time": null}, {"name": "Saffire", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Stockholm Extreme Sounds  (kilde: Up to approx. 1,050 across two rooms -- Capacity-based. Slaktkyrkan holds about 750 and Hus 7 about 300; actua)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Stockholm Extreme Sounds', 'stockholm-extreme-sounds', 'Sverige', 'Stockholm', 'Slaktkyrkan & Hus 7',
    'https://www.aeternumconcerts.se/festivals/',
    'A small two-stage extreme-metal festival in Stockholm''s former meatpacking district, preceded by an intimate Friday pre-party. The fifth-anniversary edition focuses on brutal and underground death, grind and black metal in two neighboring club rooms.',
    'Metal',
    ARRAY['Metal']::text[],
    '200_2000',
    59.2925699, 18.0799038, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-03-05', '2027-03-06', 'https://billetto.se/en/e/stockholm-extreme-sounds-biljetter-1941173',
  '[{"date": "2027-03-05", "day_label": null, "artists": [{"name": "Toxaemia", "stage": null, "time": null}]}, {"date": "2027-03-06", "day_label": null, "artists": [{"name": "Chaos In Control", "stage": null, "time": null}, {"name": "Fleshless", "stage": null, "time": null}, {"name": "Gutalax", "stage": null, "time": null}, {"name": "Yoth Iria", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Light The Dark  (kilde: Up to approx. 900 -- Official venue information states that Arbis has capacity for about 90)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Light The Dark', 'light-the-dark', 'Sverige', 'Norrköping', 'Arbis',
    'https://www.lightthedark.se/en',
    'A two-day rock and metal festival with a Christian foundation, combining established international heavy acts with Nordic bands and newer artists. The main concerts take place in the intimate Arbis theatre, with a separate free daytime church programme on Saturday.',
    'Metal',
    ARRAY['Metal','Rock']::text[],
    '200_2000',
    58.5900321, 16.1749247, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-03-19', '2027-03-20', 'https://secure.tickster.com/sv/2jxp0k7n5twwarl/products',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "Altira", "stage": null, "time": null}, {"name": "Bride", "stage": null, "time": null}, {"name": "Charizma", "stage": null, "time": null}, {"name": "Crimson Moonlight", "stage": null, "time": null}, {"name": "Extol", "stage": null, "time": null}, {"name": "Immortal Souls", "stage": null, "time": null}, {"name": "Jerusalem", "stage": null, "time": null}, {"name": "Nicke Borg – Homeland", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Tommie Haglund Festival  (kilde: Approx. 400 per main concert -- Capacity-based. Kulturhuset Najaden's concert hall has about 404 seats)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Tommie Haglund Festival', 'tommie-haglund-festival', 'Sverige', 'Halmstad', 'Kulturhuset Najaden',
    'https://www.tommiehaglund.se/the-festival-2027/?lang=en',
    'An intimate contemporary-classical festival centred on Swedish composer Tommie Haglund, combining orchestral premieres, chamber music, public talks and Delius repertoire across several venues in Halmstad and Falkenberg.',
    'Klassisk',
    ARRAY['Klassisk']::text[],
    '200_2000',
    56.6637045, 12.8539374, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-04-20', '2027-04-25', null,
  '[{"date": "2027-04-20", "day_label": null, "artists": [{"name": "Public lecture", "stage": null, "time": null}]}, {"date": "2027-04-23", "day_label": null, "artists": [{"name": "Symposium 1", "stage": null, "time": null}, {"name": "Orchestral concert", "stage": null, "time": null}, {"name": "Music in the eleventh hour", "stage": null, "time": null}]}, {"date": "2027-04-24", "day_label": null, "artists": [{"name": "Saturday morning concert", "stage": null, "time": null}, {"name": "Symposium 2", "stage": null, "time": null}, {"name": "Chamber concert (Capella Nova / Hallandsfolk / Halmstad Brass)", "stage": null, "time": null}, {"name": "Chamber concert (Löfdahl, Fredriksson, Bokor, Baranov)", "stage": null, "time": null}, {"name": "Chamber concert (programme TBC)", "stage": null, "time": null}]}, {"date": "2027-04-25", "day_label": null, "artists": [{"name": "Final concert", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Wings of AOR  (kilde: Up to approx. 1,300 per day -- Based on Trädgår'n standing concert capacity; actual 2027 attendance i)
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Wings of AOR', 'wings-of-aor', 'Sverige', 'Göteborg', 'Trädgår''n',
    'https://wingsofaor.com/',
    'A three-day boutique AOR and melodic-rock festival in central Gothenburg. The 2027 edition pairs internationally established headliners with a deep Scandinavian melodic-rock bill and several special sets and release events.',
    'Rock & Alternativ',
    ARRAY['Rock']::text[],
    '200_2000',
    57.7044398, 11.9757351, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-04-22', '2027-04-24', 'https://secure.tickster.com/ga702g83g2e8caw',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "Care of Night", "stage": null, "time": null}, {"name": "Chez Kane", "stage": null, "time": null}, {"name": "Dalton", "stage": null, "time": null}, {"name": "Emotional Fire", "stage": null, "time": null}, {"name": "FM", "stage": null, "time": null}, {"name": "Gathering of Kings", "stage": null, "time": null}, {"name": "H.E.A.T", "stage": null, "time": null}, {"name": "Harem Scarem", "stage": null, "time": null}, {"name": "Magnum", "stage": null, "time": null}, {"name": "Remedy", "stage": null, "time": null}, {"name": "The Devil Wears Nada", "stage": null, "time": null}, {"name": "Transatlantic Radio", "stage": null, "time": null}, {"name": "Vypera", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- ============================================================
-- Hold artistregisteret i takt
-- ============================================================
insert into artist_names (name, name_key, uses)
select distinct a->>'name', lower(unaccent(a->>'name')), 1
  from festival_editions e
  join festivals f on f.id = e.festival_id,
       jsonb_array_elements(e.program) day,
       jsonb_array_elements(day->'artists') a
 where f.slug in ('folkets-festival','winterwaves','rocknytt-indoor','stockholm-extreme-sounds','light-the-dark','tommie-haglund-festival','wings-of-aor')
   and e.year = 2027
   and coalesce(trim(a->>'name'), '') <> ''
on conflict (name) do nothing;

-- ============================================================
-- Kontroll: forventet 7 rader
-- ============================================================
select f.name, f.category, f.size_band, e.year, e.date_from, e.date_to,
       (select count(*) from jsonb_array_elements(e.program) d,
               jsonb_array_elements(d->'artists') a) as antall_artister
  from festival_editions e join festivals f on f.id = e.festival_id
 where f.slug in ('folkets-festival','winterwaves','rocknytt-indoor','stockholm-extreme-sounds','light-the-dark','tommie-haglund-festival','wings-of-aor')
   and e.year = 2027
 order by f.name;