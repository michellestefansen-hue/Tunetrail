-- Ta festivalene i den rekkefølgen året tar dem.
--
-- Første ekte kjøring, 31. august 2026, ga «24 heures de l'INSA de Lyon»,
-- «7th Sunday Festival», «Å-festival», «Aarhus» og «Aberdeen». Alfabetisk.
--
-- Grunnen: for en festival uten utgave for året finnes det ingen dato å
-- sortere på, og da falt sorteringen gjennom til navnet. Med rundt 600
-- festivaler uten 2027-rad ville roboten brukt et halvt år på A-ene mens
-- vårfestivalene gikk upublisert.
--
-- Rettelsen er å bruke forrige utgave som anslag: en festival som gikk i
-- april 2026 går i april 2027. Da kommer de i den rekkefølgen de trenger å
-- være på plass, og ikke i den rekkefølgen de står i alfabetet.
--
-- Returtypen endres, så funksjonen må slippes først -- create or replace
-- kan ikke endre den.
drop function if exists public.next_for_ai(int, int, int);

create function public.next_for_ai(
  p_limit        int default 8,
  p_year         int default 2027,
  -- Uten denne ville de samme åtte sidene kommet opp natt etter natt så lenge
  -- de var vanskelige. En side som var uleselig i går er som regel uleselig
  -- i dag også.
  p_min_age_days int default 14
)
returns table (
  festival_id       uuid,
  slug              text,
  name              text,
  watch_url         text,
  website_url       text,
  has_edition       boolean,
  date_from         date,
  date_to           date,
  artist_count      int,
  -- Forrige kjente utgave. Roboten bruker den til å kjenne igjen en dato som
  -- ikke kan stemme: sto festivalen i juni hvert år, er «12. desember 2027»
  -- ikke en nyhet, det er en feillesning.
  last_year         int,
  last_from         date,
  last_to           date,
  page_changed      boolean,
  ai_checked_at     timestamptz,
  ai_note           text,
  reason            text
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
  ),
  -- Siste utgave før året vi fyller ut. Både som anslag på når festivalen
  -- pleier å gå, og som noe roboten kan måle et funn mot.
  prev as (
    select distinct on (e.festival_id)
           e.festival_id, e.year, e.date_from, e.date_to
      from public.festival_editions e
     where e.year < p_year and e.date_from is not null
     order by e.festival_id, e.year desc
  )
  select
    f.id, f.slug, f.name, w.url, f.website_url,
    ed.festival_id is not null,
    ed.date_from, ed.date_to,
    coalesce(ed.artists, 0),
    prev.year, prev.date_from, prev.date_to,
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
  left join ed   on ed.festival_id   = f.id
  left join prev on prev.festival_id = f.id
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
    -- Når på året festivalen faller. Har den ingen utgave for året ennå,
    -- brukes fjorårets som anslag -- en påskefestival er en påskefestival.
    -- Festivaler vi ikke vet noe om havner sist: uten et anslag er det
    -- ingenting som sier at de haster.
    coalesce(
      extract(doy from ed.date_from),
      extract(doy from prev.date_from)
    ) nulls last,
    w.ai_checked_at nulls first,
    f.name
  limit greatest(p_limit, 0);
$$;

comment on function public.next_for_ai(int, int, int) is
  'Nattens utvalg, viktigst først: flagget av endringsvakten, så festivaler '
  'uten utgave for året, så utgaver uten program, så rundgang. Innen hver '
  'bøtte: den som faller først på året, målt mot forrige utgave.';

revoke all on function public.next_for_ai(int, int, int) from public, anon;
grant execute on function public.next_for_ai(int, int, int) to service_role;
