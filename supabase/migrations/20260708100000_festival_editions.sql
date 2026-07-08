-- Restructure: separate stable festival identity from the yearly, churny
-- program. One row per festival per year, with the whole program as JSON.
create table festival_editions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  year int not null,
  date_from date,
  date_to date,
  ticket_url text,
  program jsonb not null default '[]'::jsonb, -- [{date, day_label, artists:[{name,stage,time}]}]
  source text,
  updated_at timestamptz not null default now(),
  unique (festival_id, year)
);

alter table festival_editions enable row level security;
create policy "Public read access" on festival_editions for select using (true);

-- Migrate existing normalized program data into editions, grouped by year.
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select
  fd.festival_id,
  extract(year from fd.date)::int as year,
  min(fd.date) as date_from,
  max(fd.date) as date_to,
  (select tl.url from ticket_links tl where tl.festival_id = fd.festival_id limit 1) as ticket_url,
  jsonb_agg(
    jsonb_build_object(
      'date', to_char(fd.date, 'YYYY-MM-DD'),
      'day_label', fd.day_label,
      'artists', coalesce(day.artists, '[]'::jsonb)
    )
    order by fd.date
  ) as program,
  'migrated'
from festival_dates fd
left join lateral (
  select jsonb_agg(
    jsonb_build_object('name', a.name, 'stage', p.stage, 'time', p.set_time)
    order by a.name
  ) as artists
  from performances p
  join artists a on a.id = p.artist_id
  where p.festival_date_id = fd.id
) day on true
group by fd.festival_id, extract(year from fd.date);

-- The old normalized program tables are now fully represented by editions.
drop table performances;
drop table festival_dates;
drop table artists;
drop table ticket_links;
