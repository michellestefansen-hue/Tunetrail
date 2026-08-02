-- Steg 3 i docs/plan-brukerbidrag.md: forslag som venter på godkjenning.
--
-- Ingen redigering treffer festivals direkte. Et forslag lever her til det er
-- godkjent, og da skrives det inn av en funksjon som kjører som eier -- ikke
-- av brukeren.

create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('festival_edit','festival_new','program_edit')),
  festival_id    uuid references public.festivals(id) on delete cascade,
  edition_year   int,

  -- Kun det som er endret, ikke en kopi av hele festivalen.
  payload        jsonb not null,

  -- Hvordan de samme feltene så ut da forslaget ble sendt. Uten dette kan en
  -- godkjenning fredag stille overskrive en rettelse gjort onsdag.
  base_snapshot  jsonb not null default '{}'::jsonb,

  source_url     text,
  note           text,

  status         text not null default 'pending'
                 check (status in ('pending','applied','rejected','partial')),
  submitted_by   uuid not null references public.profiles(id),
  reviewed_by    uuid references public.profiles(id),
  review_note    text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,

  -- Et forslag gjelder enten en eksisterende festival eller en ny, aldri begge.
  constraint festival_ref_matches_kind check (
    (kind = 'festival_new' and festival_id is null)
    or (kind <> 'festival_new' and festival_id is not null)
  ),
  constraint year_only_for_program check (
    kind <> 'program_edit' or edition_year is not null
  )
);

create index if not exists submissions_pending_idx
  on public.submissions (status, created_at desc);
create index if not exists submissions_festival_idx
  on public.submissions (festival_id);

-- Hva som faktisk ble tatt inn. Gjør det mulig å svare på «hvem endret dette»
-- og å rulle tilbake.
create table if not exists public.submission_audit (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  festival_id   uuid references public.festivals(id) on delete set null,
  field         text not null,
  old_value     jsonb,
  new_value     jsonb,
  applied_at    timestamptz not null default now()
);

create index if not exists submission_audit_festival_idx
  on public.submission_audit (festival_id, applied_at desc);

alter table public.submissions      enable row level security;
alter table public.submission_audit enable row level security;

drop policy if exists "send inn forslag"     on public.submissions;
drop policy if exists "les egne forslag"     on public.submissions;
drop policy if exists "admin leser alt"      on public.submissions;
drop policy if exists "admin oppdaterer"     on public.submissions;
drop policy if exists "admin leser revisjon" on public.submission_audit;

-- Du kan sende inn i eget navn, og bare som ventende. Ingen kan sende inn noe
-- som allerede er merket godkjent.
create policy "send inn forslag"
  on public.submissions
  for insert
  to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

create policy "les egne forslag"
  on public.submissions
  for select
  to authenticated
  using (submitted_by = auth.uid());

create policy "admin leser alt"
  on public.submissions
  for select
  to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_admin));

-- Kun admin kan endre status. Selve skrivingen til festivals gjøres av
-- funksjonen i neste migrasjon, ikke herfra.
create policy "admin oppdaterer"
  on public.submissions
  for update
  to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_admin));

create policy "admin leser revisjon"
  on public.submission_audit
  for select
  to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_admin));

revoke delete, truncate on public.submissions, public.submission_audit
  from anon, authenticated;
revoke insert on public.submission_audit from anon, authenticated;
grant select, insert on public.submissions to authenticated;
grant update (status, reviewed_by, review_note, reviewed_at)
  on public.submissions to authenticated;
grant select on public.submission_audit to authenticated;
