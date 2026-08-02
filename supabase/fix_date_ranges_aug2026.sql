-- Five festivals' stored date range is narrower than the day-by-day
-- programme just received -- the programme itself is the proof of the
-- real dates, the same reasoning used for Guimaraes Jazz, Time in Jazz
-- and AMA Music Festival earlier. Widened to match.

-- Dimensions Festival: db had 2026-08-27..2026-08-31
update festival_editions e set date_from = '2026-08-27', date_to = '2026-09-01', updated_at = now()
from festivals f where e.festival_id = f.id and f.slug = 'dimensions-festival' and e.year = 2026;

-- Punk Rock Holiday: db had 2026-08-11..2026-08-14
update festival_editions e set date_from = '2026-08-08', date_to = '2026-08-14', updated_at = now()
from festivals f where e.festival_id = f.id and f.slug = 'punk-rock-holiday' and e.year = 2026;

-- Rye International Jazz & Blues Festival: db had 2026-08-27..2026-08-31
update festival_editions e set date_from = '2026-08-26', date_to = '2026-08-31', updated_at = now()
from festivals f where e.festival_id = f.id and f.slug = 'rye-international-jazz-and-blues-festival' and e.year = 2026;

-- Elbriot: db had 2026-08-08..2026-08-08
update festival_editions e set date_from = '2026-08-07', date_to = '2026-08-08', updated_at = now()
from festivals f where e.festival_id = f.id and f.slug = 'elbriot' and e.year = 2026;

-- Theatron-Festival: db had 2026-08-10..2026-08-22
update festival_editions e set date_from = '2026-07-31', date_to = '2026-08-22', updated_at = now()
from festivals f where e.festival_id = f.id and f.slug = 'theatron-festival' and e.year = 2026;

