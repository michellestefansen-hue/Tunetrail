-- Retter en feil som gjorde at ethvert felt som var tomt fra før ble avvist.
--
-- Konfliktsjekken sammenlignet base_snapshot -> felt (JSON-null når feltet var
-- tomt da forslaget ble sendt) mot to_jsonb(kolonnen). Men to_jsonb er strict:
-- to_jsonb(NULL::text) gir SQL-NULL, ikke JSON-null. For Postgres er de to
-- forskjellige, så «jsonb 'null' is distinct from NULL» er sant -- og feltet
-- ble flagget som endret av noen andre, hoppet over, og hele forslaget satt
-- til rejected fordi ingenting ble anvendt.
--
-- Det rammet nøyaktig de feltene folk vil fylle ut: beskrivelse, bilde, arena
-- på festivaler som mangler dem. Fem av fem festival_edit-forslag ble avvist
-- på denne måten 2. august 2026, mens alle programforslag gikk gjennom --
-- de bruker en annen funksjon uten konfliktsjekk.
--
-- Fikset ved å normalisere den leste verdien til JSON-null, slik at den kan
-- sammenlignes med snapshotet på like vilkår.

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
    -- Her satt feilen. Et tomt felt gir SQL-NULL fra to_jsonb, mens snapshotet
    -- inneholder JSON-null. Uten denne linjen er de to aldri like.
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

-- De fem forslagene som ble avvist av feilen står som 'rejected' og kan ikke
-- godkjennes på nytt. Sett dem tilbake til 'pending' så de dukker opp i køen
-- igjen -- kun de som ble avvist uten begrunnelse, altså av funksjonen selv
-- og ikke av et bevisst valg.
update public.submissions
   set status = 'pending', reviewed_by = null, reviewed_at = null
 where kind = 'festival_edit'
   and status = 'rejected'
   and review_note is null;
