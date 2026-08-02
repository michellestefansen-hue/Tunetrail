-- Register over artistnavn, så bidragsytere kan søke opp noen som allerede
-- finnes i stedet for å skrive navnet på nytt -- og på nytt litt annerledes.
--
-- Dette er med vilje ikke en artisttabell med egne sider og identitet. Det er
-- en oppslagsliste bygget av navnene som allerede står i programmene, slik at
-- «The Sonics», «the sonics» og «THE SONICS» ikke fortsetter å oppstå.
-- 18 545 oppføringer fordeler seg på 12 419 unike navn i dag.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create table if not exists public.artist_names (
  name      text primary key,
  -- Små bokstaver uten aksenter, så «Bjork» finner «Björk».
  name_key  text not null,
  uses      int  not null default 0
);

-- Trigram-indeks: gjør ILIKE '%noe%' rask over 12 000 rader.
create index if not exists artist_names_key_trgm
  on public.artist_names using gin (name_key gin_trgm_ops);
create index if not exists artist_names_uses_idx
  on public.artist_names (uses desc);

-- Bygg registeret fra programmene som allerede ligger inne. Kjøres på nytt
-- uten skade: on conflict oppdaterer bruksteller.
insert into public.artist_names (name, name_key, uses)
select navn,
       lower(unaccent(navn)),
       count(*)
from (
  select trim(a->>'name') as navn
  from public.festival_editions e,
       lateral jsonb_array_elements(coalesce(e.program, '[]'::jsonb)) d,
       lateral jsonb_array_elements(coalesce(d->'artists', '[]'::jsonb)) a
  where coalesce(trim(a->>'name'), '') <> ''
) t
group by navn
on conflict (name) do update set uses = excluded.uses;

alter table public.artist_names enable row level security;

drop policy if exists "les artistnavn" on public.artist_names;

-- Offentlig lesbart: søkefeltet må virke også før du har logget inn, ellers
-- møter du en tom liste og tror registeret er tomt.
create policy "les artistnavn"
  on public.artist_names
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.artist_names
  from anon, authenticated;
grant select on public.artist_names to anon, authenticated;
