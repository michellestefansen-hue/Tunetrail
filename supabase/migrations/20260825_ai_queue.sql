-- Hvem roboten skal se på i natt.
--
-- Steg 2 i docs/plan-2027-oppdatering.md. Endringsvakten sjekker 25 nettsteder
-- i døgnet og flagger dem som har endret seg, men den sier ingenting om hvem
-- som trenger et hode. Det gjør denne.
--
-- Regnestykket: 8 festivaler i natta er hele runden på rundt 40 netter. Det er
-- ikke raskt, og det er heller ikke meningen -- poenget er at ingen festival
-- blir stående lenge uten at noen har sett på den.

-- Vakten har checked_at for «så vi på siden». Dette er «så noen på innholdet»,
-- som er en helt annen og mye dyrere hendelse.
alter table public.festival_watch
  add column if not exists ai_checked_at timestamptz,
  add column if not exists ai_note text;

comment on column public.festival_watch.ai_note is
  'Hvorfor det ikke ble noe forslag: «fant bare 2026-plakaten», «lineup ligger '
  'i et Instagram-innlegg», «siden krever JavaScript». Dette er stedet roboten '
  'har lov til å gi opp -- og listen over hva du må ta for hånd uansett.';

create index if not exists festival_watch_ai_due_idx
  on public.festival_watch (ai_checked_at nulls first)
  where failures < 5;

/* --------------------------------------------------------------- utvalg --- */

create or replace function public.next_for_ai(
  p_limit        int default 8,
  p_year         int default 2027,
  -- Uten denne ville de samme åtte sidene kommet opp natt etter natt så lenge
  -- de var vanskelige. En side som var uleselig i går er som regel uleselig
  -- i dag også.
  p_min_age_days int default 14
)
returns table (
  festival_id   uuid,
  slug          text,
  name          text,
  watch_url     text,
  website_url   text,
  has_edition   boolean,
  date_from     date,
  date_to       date,
  artist_count  int,
  page_changed  boolean,
  ai_checked_at timestamptz,
  ai_note       text,
  reason        text
)
language sql
security definer
set search_path = public
as $$
  with ed as (
    select e.festival_id, e.date_from, e.date_to,
           (select count(*)::int
              from jsonb_array_elements(coalesce(e.program, '[]'::jsonb)) d,
                   jsonb_array_elements(coalesce(d->'artists', '[]'::jsonb)) a) as artists
      from public.festival_editions e
     where e.year = p_year
  )
  select
    f.id, f.slug, f.name, w.url, f.website_url,
    ed.festival_id is not null,
    ed.date_from, ed.date_to,
    coalesce(ed.artists, 0),
    w.pending,
    w.ai_checked_at,
    w.ai_note,
    case
      when w.pending                then 'siden har endret seg'
      when ed.festival_id is null   then 'ingen ' || p_year || '-utgave'
      when coalesce(ed.artists,0)=0 then 'utgave uten program'
      else 'rundgang'
    end
  from public.festival_watch w
  join public.festivals f on f.id = w.festival_id
  left join ed on ed.festival_id = f.id
  where w.failures < 5
    -- Sidene som er gitt opp på skal ikke ligge først i køen for alltid.
    and (
      w.ai_checked_at is null
      or w.ai_checked_at < now() - make_interval(days => p_min_age_days)
      -- ...men har vakten sett en endring etter at roboten var der sist, er
      -- det nettopp da den skal tilbake, uansett hvor nylig det var.
      or (w.changed_at is not null and w.changed_at > w.ai_checked_at)
    )
    -- Ligger det allerede et ubehandlet forslag for året, ville et nytt bare
    -- blitt to rader som sier det samme i køen din.
    and not exists (
      select 1 from public.submissions s
       where s.festival_id = f.id
         and s.status = 'pending'
         and s.kind = 'program_edit'
         and s.edition_year = p_year
    )
  order by
    case
      when w.pending                       then 0
      when ed.festival_id is null          then 1
      when coalesce(ed.artists, 0) = 0     then 2
      else 3
    end,
    -- Innen hver bøtte: det som skjer først haster mest. En festival i april
    -- 2027 trenger programmet sitt før en i august.
    ed.date_from nulls last,
    w.ai_checked_at nulls first,
    f.name
  limit greatest(p_limit, 0);
$$;

comment on function public.next_for_ai(int, int, int) is
  'Nattens utvalg, viktigst først: flagget av endringsvakten, så festivaler '
  'uten utgave for året, så utgaver uten program, så rundgang på eldste først.';

-- security definer, så funksjonen ser hele vaktlisten -- den er ikke offentlig
-- lesbar. Roboten kjører med tjenestenøkkelen og har uansett full tilgang;
-- sperren her er for innloggede brukere, som ikke skal kunne kartlegge hva
-- basen mangler.
revoke all on function public.next_for_ai(int, int, int) from public, anon;
grant execute on function public.next_for_ai(int, int, int) to service_role;
