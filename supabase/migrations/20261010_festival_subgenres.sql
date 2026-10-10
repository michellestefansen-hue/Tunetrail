-- Undersjanger: ett nivaa under tags.
--
-- `tags` sier at en festival er elektronisk. Den sier ikke om den er techno
-- eller hardstyle, og i dansemusikk er det den viktigste forskjellen av alle.
-- Tomorrowland og Dekmantel baerer i dag noeyaktig samme to tagger --
-- Elektronisk & Dans og Techno & House -- enda de knapt deler publikum. 98 %
-- av festivalene med Techno & House baerer ogsaa Elektronisk & Dans, saa
-- taggene kan ikke skille dem.
--
-- Stoerrelse loeste det samme problemet for metal, der skalaen foelger
-- scenen: 85 000 paa en slette og 300 i en klubb er forskjellige hobbyer. For
-- elektronisk gjoer den ikke det. Delingen mellom mainstream og underground
-- gaar paa tvers av stoerrelse -- Kappa FuturFestival har 100 000 og deler
-- publikum med Dekmantels 15 000, ikke med Tomorrowlands 400 000.
--
-- Array og ikke enkeltverdi: en festival kan vaere techno og house samtidig,
-- og de fleste store er flere ting. `category` er fortsatt hovedsjangeren.
--
-- Noekler og ikke visningstekst, av samme grunn som size_band: teksten finnes
-- paa fem spraak, og rekkefoelgen defineres ett sted i src/lib/festivals.ts.
--
-- Nullbar med vilje. 731 festivaler finnes fra foer uten dette, og aa gjette
-- ville vaert aa dikte opp data.

alter table public.festivals
  add column if not exists subgenres text[];

-- Ordlista daekker elektronisk og tungt. De oevrige sjangrene kan legges til
-- senere ved aa utvide denne check-en -- kolonnen trenger ingen endring.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'festivals_subgenres_check'
  ) then
    alter table public.festivals
      add constraint festivals_subgenres_check check (
        subgenres is null or subgenres <@ array[
          -- elektronisk
          'techno', 'house', 'trance', 'hardstyle', 'dnb',
          'psytrance', 'edm', 'ambient', 'disco',
          -- tungt
          'death_metal', 'black_metal', 'doom_stoner', 'thrash',
          'power_prog', 'metalcore', 'goth_industrial', 'punk',
          'classic_rock', 'indie_alt'
        ]::text[]
      );
  end if;
end $$;

comment on column public.festivals.subgenres is
  'Undersjangre, ett nivaa under tags. Noekler, ikke visningstekst -- se SUBGENRES i src/lib/festivals.ts.';

-- Guiden grupperer paa dette feltet, saa det spoerres paa ved hver visning.
create index if not exists festivals_subgenres_idx
  on public.festivals using gin (subgenres)
  where subgenres is not null;


-- apply_submission har en hardkodet liste over felt som kan godkjennes. Uten
-- subgenres her ville en endring blitt stille hoppet over, og forslaget satt
-- til 'rejected' uten at noe skjedde -- samme feil som 20260803 rettet for
-- size_band. Arrayet haandteres som tags, siden begge er text[].
--
-- Resten av funksjonen er uendret fra 20260803_festival_size.sql.
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
    if f not in ('venue_name','website_url','image_url','description','tags','size_band','subgenres') then
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
    current_val := coalesce(current_val, 'null'::jsonb);

    if (s.base_snapshot ? f)
       and coalesce(s.base_snapshot -> f, 'null'::jsonb) is distinct from current_val then
      conflicted := conflicted || f;
      continue;
    end if;

    if f in ('tags', 'subgenres') then
      execute format(
        'update festivals set %I = case
            when jsonb_typeof($1) = ''array''
            then (select array_agg(value) from jsonb_array_elements_text($1))
            else null
          end
         where id = $2', f)
        using proposed, s.festival_id;
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
