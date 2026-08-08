-- Endringsvakt: holder øye med festivalenes egne nettsteder.
--
-- Bakgrunnen er at Ticketmaster-jobben ble slått av 8. august 2026. Den skrev
-- rett til databasen og traff 2 av 11 ganger. Festivalens eget nettsted er
-- ferskere og riktigere, men det er 669 nettsteder, og de er uendret det meste
-- av tiden.
--
-- Derfor deles jobben i to. Denne tabellen er den billige halvdelen: den svarer
-- bare på «har noe endret seg?», med et fingeravtrykk av teksten på siden.
-- Ingen AI, ingen kostnad, kjører i skyen uten at maskinen er på.
--
-- Den dyre halvdelen -- «hva endret seg?» -- kjøres av Claude Code lokalt, og
-- bare på radene der pending er true. Den skriver forslag til submissions, ikke
-- til festivals. Ingenting herfra går rett i basen.

create table if not exists public.festival_watch (
  festival_id uuid primary key references public.festivals(id) on delete cascade,

  -- Egen kolonne og ikke bare festivals.website_url: for mange festivaler
  -- ligger lineupen på en underside, og da skal vakten se på den i stedet.
  url text not null,

  -- sha256 av normalisert sidetekst. Se normaliseringen i /api/watch --
  -- rå HTML endrer seg hver eneste natt og ville gitt bare falske treff.
  fingerprint text,

  -- Et lite tekstutdrag fra sist sjekk. Gjør det mulig å se hva vakten faktisk
  -- leste, uten å hente siden på nytt -- de fleste feilsøkinger starter med
  -- «leste den i det hele tatt lineupen, eller bare en cookie-banner?».
  excerpt text,

  checked_at  timestamptz,
  changed_at  timestamptz,

  -- Venter på gjennomgang av lag 3. Settes når fingeravtrykket endrer seg,
  -- nullstilles når Claude Code har sett på siden.
  pending boolean not null default false,

  -- Et nettsted som er nede skal ikke ligge først i køen for alltid. Etter
  -- gjentatte feil faller festivalen bakover, og feilen kan leses av.
  failures   int not null default 0,
  last_error text,

  created_at timestamptz not null default now()
);

-- Køen plukker alltid den som ble sjekket for lengst siden, med aldri sjekkede
-- først. Delvis indeks fordi de ferdig sjekkede ikke er interessante her.
create index if not exists festival_watch_due_idx
  on public.festival_watch (checked_at nulls first)
  where failures < 5;

create index if not exists festival_watch_pending_idx
  on public.festival_watch (changed_at desc)
  where pending;

alter table public.festival_watch enable row level security;

-- Ingen tilgang for anon. Jobben bruker service role, som går utenom RLS.
-- Administrator kan lese for å se hva vakten holder på med.
drop policy if exists "admin leser vaktlisten" on public.festival_watch;
create policy "admin leser vaktlisten"
  on public.festival_watch for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

revoke all on public.festival_watch from anon;

-- Fyll listen med alle festivaler som har et nettsted å se på. Kjøres om igjen
-- uten skade -- nye festivaler kommer til, eksisterende rader røres ikke.
insert into public.festival_watch (festival_id, url)
select f.id, f.website_url
  from public.festivals f
 where coalesce(trim(f.website_url), '') <> ''
on conflict (festival_id) do nothing;
