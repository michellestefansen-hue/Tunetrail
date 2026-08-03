-- Festivalstørrelse: publikumstall i seks trinn.
--
-- Lagres som nøkkel og ikke som visningstekst ('50000_100000', ikke «50 000 –
-- 100 000 deltagere»), av to grunner: teksten finnes på fem språk, og et tall
-- i en tekststreng kan ikke sorteres. Nøklene er ordnet fra minst til størst i
-- src/lib/festivals.ts, som er det ene stedet rekkefølgen defineres.
--
-- Kolonnen ligger på festivals og ikke på festival_editions. Størrelsen er en
-- egenskap ved festivalen som holder seg fra år til år, på samme måte som
-- bilde, sjanger og koordinater -- til forskjell fra datoer og program.
--
-- Nullbar med vilje. 693 festivaler finnes fra før uten dette tallet, og å
-- gjette på dem ville vært å dikte opp data. Feltet fylles inn over tid av
-- bidragsytere, og festivalsiden viser det bare når det finnes.

alter table public.festivals
  add column if not exists size_band text;

-- Bare de seks trinnene, aldri noe annet. Check-en er databasens egen
-- garanti: skjemaet validerer også, men skjemaet kan omgås.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'festivals_size_band_check'
  ) then
    alter table public.festivals
      add constraint festivals_size_band_check check (
        size_band is null or size_band in (
          'under_200',
          '200_2000',
          '2000_10000',
          '10000_50000',
          '50000_100000',
          'over_100000'
        )
      );
  end if;
end $$;

comment on column public.festivals.size_band is
  'Publikumstall i trinn. Nøkkel, ikke visningstekst -- se SIZE_BANDS i src/lib/festivals.ts.';

-- Filteret spør på dette feltet for 693 festivaler ved hvert kartsøk.
create index if not exists festivals_size_band_idx
  on public.festivals (size_band)
  where size_band is not null;


-- apply_submission har en hardkodet liste over felt som kan godkjennes. Uten
-- size_band her ville en størrelsesendring blitt stille hoppet over i køen --
-- og siden statusen settes til 'rejected' når ingenting ble anvendt, ville
-- forslaget sett behandlet ut uten at noe skjedde. Samme klasse feil som
-- 20260802_fix_null_conflict.sql rettet.
--
-- Resten av funksjonen er uendret fra 20260802_fix_null_conflict.sql.
create or replace function public.apply_submission(
  p_submission_id uuid,
  p_fields        text[],
  p_review_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s           submissions;
  f           text;
  proposed    jsonb;
  current_val jsonb;
  applied     text[] := '{}';
  conflicted  text[] := '{}';
  skipped     text[] := '{}';
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Bare administrator kan godkjenne forslag.';
  end if;

  select * into s from submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Fant ikke forslaget.';
  end if;
  if s.status <> 'pending' then
    raise exception 'Forslaget er allerede behandlet (%).', s.status;
  end if;
  if s.kind <> 'festival_edit' then
    raise exception 'Denne funksjonen håndterer bare festival_edit ennå.';
  end if;

  foreach f in array coalesce(p_fields, '{}') loop
    if f not in ('venue_name','website_url','image_url','description','tags','size_band') then
      skipped := skipped || f;
      continue;
    end if;
    if not (s.payload ? f) then
      skipped := skipped || f;
      continue;
    end if;

    proposed := s.payload -> f;

    execute format('select to_jsonb(t.%I) from festivals t where t.id = $1', f)
      into current_val using s.festival_id;
    -- Et tomt felt gir SQL-NULL fra to_jsonb, mens snapshotet inneholder
    -- JSON-null. Uten denne linjen er de to aldri like.
    current_val := coalesce(current_val, 'null'::jsonb);

    if (s.base_snapshot ? f)
       and coalesce(s.base_snapshot -> f, 'null'::jsonb) is distinct from current_val then
      conflicted := conflicted || f;
      continue;
    end if;

    if f = 'tags' then
      update festivals
         set tags = case
                      when jsonb_typeof(proposed) = 'array'
                      then (select array_agg(value) from jsonb_array_elements_text(proposed))
                      else null
                    end
       where id = s.festival_id;
    else
      execute format('update festivals set %I = $1 where id = $2', f)
        using nullif(proposed #>> '{}', ''), s.festival_id;
    end if;

    insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
    values (s.id, s.festival_id, f, current_val, proposed);

    applied := applied || f;
  end loop;

  update submissions
     set status = case
                    when array_length(applied, 1) is null then 'rejected'
                    when array_length(applied, 1) = (select count(*) from jsonb_object_keys(s.payload))
                      then 'applied'
                    else 'partial'
                  end,
         reviewed_by = auth.uid(),
         review_note = p_review_note,
         reviewed_at = now()
   where id = s.id;

  return jsonb_build_object(
    'applied',    to_jsonb(applied),
    'conflicted', to_jsonb(conflicted),
    'skipped',    to_jsonb(skipped)
  );
end;
$$;


-- Nye festivaler må få størrelsen med inn. Bevisst ingen validering her selv
-- om skjemaet krever feltet: forslag som alt ligger i køen ble sendt før
-- feltet fantes, og de skal fortsatt kunne godkjennes.
--
-- Resten av funksjonen er uendret fra 20260802_apply_new_festival.sql.
create or replace function public.apply_new_festival(
  p_submission_id uuid,
  p_review_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s          submissions;
  d          jsonb;
  base_slug  text;
  new_slug   text;
  n          int := 1;
  fest_id    uuid;
  prog       jsonb;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Bare administrator kan godkjenne forslag.';
  end if;

  select * into s from submissions where id = p_submission_id for update;
  if not found then raise exception 'Fant ikke forslaget.'; end if;
  if s.status <> 'pending' then
    raise exception 'Forslaget er allerede behandlet (%).', s.status;
  end if;
  if s.kind <> 'festival_new' then
    raise exception 'Dette er ikke et forslag om ny festival.';
  end if;

  d := s.payload;

  if coalesce(trim(d->>'name'), '') = '' then
    raise exception 'Forslaget mangler navn.';
  end if;
  if d->>'latitude' is null or d->>'date_from' is null then
    raise exception 'Forslaget mangler koordinater eller datoer.';
  end if;

  -- Sluggen er URL-en, så den lages her og ikke av bidragsyteren. To
  -- festivaler som begge heter «Sommerfest» kan ikke dele adresse.
  base_slug := slugify(d->>'name');
  if base_slug = '' then base_slug := 'festival'; end if;
  new_slug := base_slug;
  while exists (select 1 from festivals where slug = new_slug) loop
    n := n + 1;
    new_slug := base_slug || '-' || n;
  end loop;

  insert into festivals (
    name, slug, country, city, venue_name, website_url,
    description, image_url, tags, size_band, latitude, longitude, source
  )
  values (
    trim(d->>'name'), new_slug, d->>'country', d->>'city', d->>'venue_name',
    d->>'website_url', d->>'description', d->>'image_url',
    case when jsonb_typeof(d->'tags') = 'array'
         then (select array_agg(value) from jsonb_array_elements_text(d->'tags'))
         else null end,
    nullif(trim(coalesce(d->>'size_band', '')), ''),
    (d->>'latitude')::double precision,
    (d->>'longitude')::double precision,
    'community'
  )
  returning id into fest_id;

  -- Uten utgave er festivalen usynlig: listen viser bare det som kommer.
  prog := coalesce(d->'program', '[]'::jsonb);
  insert into festival_editions (
    festival_id, year, date_from, date_to, ticket_url, program, source
  )
  values (
    fest_id,
    extract(year from (d->>'date_from')::date)::int,
    (d->>'date_from')::date,
    (d->>'date_to')::date,
    d->>'ticket_url',
    prog,
    'community'
  );

  -- Nye artistnavn blir søkbare for neste bidragsyter.
  insert into artist_names (name, name_key, uses)
  select distinct a->>'name', lower(unaccent(a->>'name')), 1
    from jsonb_array_elements(prog) day,
         jsonb_array_elements(day->'artists') a
   where coalesce(trim(a->>'name'), '') <> ''
  on conflict (name) do nothing;

  insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
  values (s.id, fest_id, 'festival_new', null, d);

  update submissions
     set status = 'applied',
         reviewed_by = auth.uid(),
         review_note = p_review_note,
         reviewed_at = now()
   where id = s.id;

  return jsonb_build_object('slug', new_slug, 'festival_id', fest_id);
end;
$$;
