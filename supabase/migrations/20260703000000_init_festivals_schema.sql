-- Festivals
create table festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  city text,
  region text,
  venue_name text,
  latitude numeric,
  longitude numeric,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket links (a festival can have several: official site, Ticketmaster, day passes, etc.)
create table ticket_links (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  provider text not null,
  url text not null,
  label text,
  created_at timestamptz not null default now()
);

-- Festival dates (a festival typically spans several days)
create table festival_dates (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals (id) on delete cascade,
  date date not null,
  day_label text,
  created_at timestamptz not null default now(),
  unique (festival_id, date)
);

-- Artists (normalized so the same artist can appear across festivals/dates)
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

-- Performances (an artist playing on a specific festival date)
create table performances (
  id uuid primary key default gen_random_uuid(),
  festival_date_id uuid not null references festival_dates (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete cascade,
  stage text,
  set_time time,
  created_at timestamptz not null default now(),
  unique (festival_date_id, artist_id, stage)
);

create index idx_ticket_links_festival_id on ticket_links (festival_id);
create index idx_festival_dates_festival_id on festival_dates (festival_id);
create index idx_festival_dates_date on festival_dates (date);
create index idx_performances_festival_date_id on performances (festival_date_id);
create index idx_performances_artist_id on performances (artist_id);

-- Public read access (this is a public festival directory, no auth required to browse)
alter table festivals enable row level security;
alter table ticket_links enable row level security;
alter table festival_dates enable row level security;
alter table artists enable row level security;
alter table performances enable row level security;

create policy "Public read access" on festivals for select using (true);
create policy "Public read access" on ticket_links for select using (true);
create policy "Public read access" on festival_dates for select using (true);
create policy "Public read access" on artists for select using (true);
create policy "Public read access" on performances for select using (true);
