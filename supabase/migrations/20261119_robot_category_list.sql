-- Roboten sjekket hovedsjangeren mot feil liste.
--
-- robot_new_festival_problem (20261118_robot_may_propose_festivals.sql) brukte
-- den første lista over hovedsjangre, fra 20260703020000_add_festival_category.sql.
-- Den ble erstattet da Tunetrail ble europeisk (20260703030000_europe_expansion.sql):
-- «Rock & Metal» finnes ikke lenger. Et forslag med «Rock & Metal» slapp derfor
-- gjennom til køen, og stoppet først ved godkjenning, med
-- «violates check constraint festivals_category_check». Det skjedde med Clam
-- Rock 17. november 2026.
--
-- Bare lista er endret. Resten av funksjonen er uendret.

create or replace function public.robot_new_festival_problem(
  p_payload   jsonb,
  p_note      text,
  p_submitter uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  max_per_day     constant int := 3;
  max_pending     constant int := 5;

  d       jsonb := p_payload;
  k       text;
  host    text;
  d_from  date;
  d_to    date;
  lat     double precision;
  lon     double precision;
  basis   text;
  hit     text;
  n       int;
begin
  -- 1. Felt vi må ha.
  foreach k in array array[
    'name', 'country', 'city', 'website_url', 'image_url',
    'category', 'size_band', 'date_from', 'date_to'
  ] loop
    if coalesce(trim(d->>k), '') = '' then
      return format('Forslaget om ny festival mangler %s.', k);
    end if;
  end loop;

  if coalesce(jsonb_typeof(d->'tags'), '') <> 'array' or jsonb_array_length(d->'tags') = 0 then
    return 'Forslaget om ny festival mangler tagger.';
  end if;
  if coalesce(jsonb_typeof(d->'latitude'), '') <> 'number'
     or coalesce(jsonb_typeof(d->'longitude'), '') <> 'number' then
    return 'Forslaget om ny festival mangler koordinater.';
  end if;

  -- Samme liste som festivals_category_check (20260703030000_europe_expansion.sql).
  -- En test i supabase/test/20_new_festival.test.sql holder dem like.
  if d->>'category' not in (
       'Pop & Mainstream', 'Rock & Alternativ', 'Metal', 'Punk & Hardcore', 'Indie',
       'Elektronisk & Dans', 'Techno & House', 'Hip-Hop & R&B', 'Jazz & Soul',
       'Klassisk', 'Folk & Americana', 'Reggae & World', 'Blandet/Flersjanger') then
    return format('«%s» er ikke en hovedsjanger.', d->>'category');
  end if;
  if d->>'size_band' not in (
       'under_200', '200_2000', '2000_10000', '10000_50000', '50000_100000', 'over_100000') then
    return format('«%s» er ikke et publikumstrinn.', d->>'size_band');
  end if;

  if d->>'website_url' !~* '^https?://' then
    return 'website_url er ikke en nettadresse.';
  end if;
  if d->>'image_url' !~* '^https://' then
    return 'image_url må være en https-adresse.';
  end if;

  lat := (d->>'latitude')::double precision;
  lon := (d->>'longitude')::double precision;
  if lat not between 27 and 72 or lon not between -32 and 45 then
    return format('Koordinatene (%s, %s) ligger utenfor Europa.', lat, lon);
  end if;

  d_from := (d->>'date_from')::date;
  d_to   := (d->>'date_to')::date;
  if d_to < d_from then
    return 'date_to er før date_from.';
  end if;
  if d_to - d_from + 1 > 60 then
    return format('%s dager er ikke en festival, det er en skrivefeil.', d_to - d_from + 1);
  end if;
  if d_to < current_date then
    return 'Datoene er i fortiden. Roboten foreslår bare kommende utgaver.';
  end if;

  -- 2. Intet felt uten bevis. Koordinater, datoer og bilde må ha en kilde.
  foreach k in array array['coordinates', 'dates', 'image_url'] loop
    if coalesce(trim(d->'sources'->>k), '') = '' then
      return format('%s mangler kilde. Si hvor det ble funnet.', k);
    end if;
  end loop;

  -- Det roboten får gjette: enten belagt, eller merket som gjetning.
  foreach k in array array['size_band', 'category', 'tags'] loop
    if not (coalesce(d->'guesses', '{}'::jsonb) ? k)
       and coalesce(trim(d->'sources'->>k), '') = '' then
      return format('%s er hverken belagt eller merket som gjetning.', k);
    end if;
  end loop;

  -- Hver gjetning må ha en begrunnelse, og stå i notatet.
  for k, basis in select * from jsonb_each_text(coalesce(d->'guesses', '{}'::jsonb)) loop
    if length(trim(basis)) < 20 then
      return format('Gjetningen på %s har for tynn begrunnelse.', k);
    end if;
  end loop;
  if coalesce(trim(p_note), '') = '' then
    return 'Forslaget om ny festival må ha et notat som sier hvor det ble funnet.';
  end if;
  if (select count(*) from jsonb_object_keys(coalesce(d->'guesses', '{}'::jsonb))) > 0
     and position('GJETTET' in p_note) = 0 then
    return 'Gjetninger må stå i notatet under «GJETTET», så du ser dem i køen.';
  end if;

  -- 3. Finnes den fra før?
  host := public.site_host(d->>'website_url');
  select f.name into hit from public.festivals f
   where public.site_host(f.website_url) = host and host <> '' limit 1;
  if hit is not null then
    return format('Festivalen finnes allerede som «%s» (samme nettsted).', hit);
  end if;

  select f.name into hit from public.festivals f
   where f.slug = public.slugify(d->>'name') limit 1;
  if hit is not null then
    return format('Festivalen finnes allerede som «%s» (samme navn).', hit);
  end if;

  if exists (
    select 1 from public.submissions s
     where s.kind = 'festival_new' and s.status = 'pending'
       and public.site_host(s.payload->>'website_url') = host
  ) then
    return 'Festivalen ligger allerede i køen (samme nettsted).';
  end if;

  -- 4. Tak.
  select count(*) into n from public.submissions s
   where s.kind = 'festival_new' and s.submitted_by = p_submitter
     and s.created_at > now() - interval '1 day';
  if n >= max_per_day then
    return format('Roboten kan foreslå høyst %s nye festivaler per døgn.', max_per_day);
  end if;

  select count(*) into n from public.submissions s
   where s.kind = 'festival_new' and s.submitted_by = p_submitter and s.status = 'pending';
  if n >= max_pending then
    return format('Det ligger allerede %s nye festivaler fra roboten i køen. Godkjenn eller avvis noen først.', n);
  end if;

  return null;
end;
$$;

-- Svaret skal vise «true» når dette er kjørt.
select prosrc like '%Rock & Alternativ%' as riktig_sjangerliste
  from pg_proc
 where proname = 'robot_new_festival_problem';
