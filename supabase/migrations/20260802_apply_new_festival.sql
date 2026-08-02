-- Steg 6 i docs/plan-brukerbidrag.md: opprett en festival fra et forslag.
--
-- I motsetning til en redigering finnes det ingenting å sammenligne mot, så
-- her er det ingen konfliktsjekk. Til gjengjeld må to ting skje som ikke
-- gjelder noe annet sted: sluggen lages her, og både festivalen og første
-- utgave må opprettes i samme operasjon -- en festival uten utgave vises
-- ingen steder i appen.

-- Bygger en URL-vennlig slug. Ikke immutable: unaccent avhenger av en ordbok.
create or replace function public.slugify(p text)
returns text language sql stable parallel safe as $$
  select trim(both '-' from regexp_replace(
    lower(unaccent(
      -- unaccent tar ikke ø/æ/å, og en norsk app kan ikke la dem falle bort.
      translate(coalesce(p, ''), 'øØæÆåÅðÐþÞßłŁđĐ', 'oOaAaAdDtTslLdD')
    )),
    '[^a-z0-9]+', '-', 'g'));
$$;

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
    description, image_url, tags, latitude, longitude, source
  )
  values (
    trim(d->>'name'), new_slug, d->>'country', d->>'city', d->>'venue_name',
    d->>'website_url', d->>'description', d->>'image_url',
    case when jsonb_typeof(d->'tags') = 'array'
         then (select array_agg(value) from jsonb_array_elements_text(d->'tags'))
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
revoke all on function public.slugify(text) from public, anon;
grant execute on function public.apply_new_festival(uuid, text) to authenticated;
