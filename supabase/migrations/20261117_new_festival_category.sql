-- En ny festival skal få hovedsjanger og undersjanger med seg.
--
-- apply_new_festival lagret tagger og størrelse, men ikke `category` og
-- `subgenres`. Selv et fullstendig forslag ga dermed en festival uten
-- hovedsjanger, og en festival uten hovedsjanger havner ikke riktig i guidene
-- eller i sjangerfilteret. Det gjaldt også festivaler foreslått fra skjemaet,
-- som aldri hadde noen måte å oppgi dem på.
--
-- Bevisst ingen egen validering her, av samme grunn som for size_band
-- (20260803_festival_size.sql): forslag som alt ligger i køen ble sendt uten
-- feltene, og de skal fortsatt kunne godkjennes. CHECK-ene på kolonnene
-- avviser en ugyldig verdi, så en feil nøkkel stopper godkjenningen med en
-- feilmelding i stedet for å lagres.
--
-- Resten av funksjonen er uendret fra 20260803_festival_size.sql.
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
    description, image_url, tags, size_band, category, subgenres,
    latitude, longitude, source
  )
  values (
    trim(d->>'name'), new_slug, d->>'country', d->>'city', d->>'venue_name',
    d->>'website_url', d->>'description', d->>'image_url',
    case when jsonb_typeof(d->'tags') = 'array'
         then (select array_agg(value) from jsonb_array_elements_text(d->'tags'))
         else null end,
    nullif(trim(coalesce(d->>'size_band', '')), ''),
    nullif(trim(coalesce(d->>'category', '')), ''),
    case when jsonb_typeof(d->'subgenres') = 'array'
              and jsonb_array_length(d->'subgenres') > 0
         then (select array_agg(value) from jsonb_array_elements_text(d->'subgenres'))
         else null end,
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

revoke all on function public.apply_new_festival(uuid, text) from public, anon;
grant execute on function public.apply_new_festival(uuid, text) to authenticated;

-- Svaret skal vise «true» når dette er kjørt.
select prosrc like '%category, subgenres%' as hovedsjanger_lagres
  from pg_proc
 where proname = 'apply_new_festival';
