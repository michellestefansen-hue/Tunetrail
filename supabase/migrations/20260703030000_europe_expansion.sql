-- Add country and backfill existing Norwegian festivals
alter table festivals add column if not exists country text;
update festivals set country = 'Norge' where country is null;

-- Expand the category taxonomy for a Europe-wide scope.
-- Drop the old CHECK, remap the one category that no longer exists, then re-add.
alter table festivals drop constraint if exists festivals_category_check;

update festivals set category = 'Metal' where category = 'Rock & Metal';

alter table festivals add constraint festivals_category_check check (
  category in (
    'Pop & Mainstream',
    'Rock & Alternativ',
    'Metal',
    'Punk & Hardcore',
    'Indie',
    'Elektronisk & Dans',
    'Techno & House',
    'Hip-Hop & R&B',
    'Jazz & Soul',
    'Klassisk',
    'Folk & Americana',
    'Reggae & World',
    'Blandet/Flersjanger'
  )
);
