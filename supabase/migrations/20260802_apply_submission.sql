-- Steg 3b i docs/plan-brukerbidrag.md: ta et forslag inn i basen.
--
-- Dette er den eneste veien fra et forslag til festivals-tabellen. Den kjører
-- som eier, slik at ingen bruker trenger skriverett på festivals -- og som én
-- transaksjon, slik at endring, revisjonslogg og status enten skjer samlet
-- eller ikke i det hele tatt.
--
-- Godkjenning skjer felt for felt. Retter noen arenanavnet riktig og roter til
-- sjangrene i samme slengen, skal du kunne ta det ene og la det andre ligge.

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

  -- for update: to samtidige godkjenninger av samme forslag skal ikke kunne
  -- anvende det to ganger.
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
    -- Hviteliste. Uten den kunne et felt i payload peke på hva som helst i
    -- tabellen, inkludert slug.
    if f not in ('venue_name','website_url','image_url','description','tags') then
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

    -- Har feltet endret seg siden forslaget ble sendt, er dette ikke lenger
    -- den endringen bidragsyteren så for seg. Da rører vi det ikke.
    if (s.base_snapshot ? f)
       and (s.base_snapshot -> f) is distinct from current_val then
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

-- Avvis uten å endre noe.
create or replace function public.reject_submission(
  p_submission_id uuid,
  p_review_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Bare administrator kan avvise forslag.';
  end if;

  update submissions
     set status = 'rejected',
         reviewed_by = auth.uid(),
         review_note = p_review_note,
         reviewed_at = now()
   where id = p_submission_id and status = 'pending';
end;
$$;

revoke all on function public.apply_submission(uuid, text[], text)  from public, anon;
revoke all on function public.reject_submission(uuid, text)         from public, anon;
grant execute on function public.apply_submission(uuid, text[], text) to authenticated;
grant execute on function public.reject_submission(uuid, text)       to authenticated;
