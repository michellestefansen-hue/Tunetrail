-- Fix Nova Rock Festival: edition date_from/date_to were set to 2026-09-05
-- (a single day in September), while the program itself correctly holds
-- 2026-06-11..2026-06-14 (matches musicfestivalwizard.com's listed dates).
update festival_editions fe
set date_from = '2026-06-11',
    date_to = '2026-06-14'
from festivals f
where f.id = fe.festival_id
  and f.slug = 'nova-rock-festival'
  and fe.year = 2026;

-- Fix Rock for People: the only "artist" entry is scraped commentary text,
-- not a real name. Replace with the actual headliner it refers to.
update festival_editions fe
set program = '[{"date": "2026-06-14", "day_label": null, "artists": [{"name": "Iron Maiden", "stage": null, "time": null}]}]'::jsonb
from festivals f
where f.id = fe.festival_id
  and f.slug = 'rock-for-people'
  and fe.year = 2026;
