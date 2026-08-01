-- Adds the tags column. Run this before seed_backfill_tags.sql.
--
-- The old single `category` column stays in place, untouched, as a safety
-- net — nothing in the app reads it anymore after this change, so nothing
-- breaks if this migration is run without the backfill, or the other way
-- around, in the wrong order.
alter table festivals add column if not exists tags text[];
