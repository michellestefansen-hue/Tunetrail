-- Steg 4 i docs/plan-brukerbidrag.md: ta et programforslag inn i basen.
--
-- Forslaget er en liste operasjoner, ikke et ferdig program. Derfor slås det
-- sammen med det som står der nå, i stedet for å erstatte det. To personer kan
-- bidra samme kveld uten å slette hverandres arbeid -- og et program kan ikke
-- miste 32 artister slik Time in Jazz gjorde 2. august 2026.
--
-- Operasjoner er dessuten selvforsonende: å legge til et navn som allerede
-- står der gjør ingenting, og å fjerne et navn som er borte er heller ikke et
-- problem. Derfor trengs ingen konfliktsjekk slik de vanlige feltene har.

create or replace function public.artist_key(p text)
-- stable, ikke immutable: unaccent avhenger av en ordbok, og å love mer enn
-- det stemmer ville vært en felle den dagen noen bygger en indeks på dette.
returns text language sql stable parallel safe as $$
  select regexp_replace(lower(unaccent(coalesce(p, ''))), '[^a-z0-9]', '', 'g');
$$;

create or replace function public.apply_program_submission(
  p_submission_id uuid,
  p_ops           jsonb,
  p_review_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s              submissions;
  prog           jsonb;
  op             jsonb;
  day_idx        int;
  art_idx        int;
  -- Ikke kall denne «found»: det navnet er PostgreSQLs egen, og å skygge for
  -- den ville gjort «if not found then raise» stille virkningsløs.
  has_artist     boolean;
  n_add          int := 0;
  n_remove       int := 0;
  n_move         int := 0;
  target         text;
  nm             text;
  cur_ticket     text;
  ticket_applied boolean := false;
  ticket_skipped boolean := false;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Bare administrator kan godkjenne forslag.';
  end if;

  select * into s from submissions where id = p_submission_id for update;
  if not found then raise exception 'Fant ikke forslaget.'; end if;
  if s.status <> 'pending' then
    raise exception 'Forslaget er allerede behandlet (%).', s.status;
  end if;
  if s.kind <> 'program_edit' then
    raise exception 'Dette er ikke et programforslag.';
  end if;

  select coalesce(program, '[]'::jsonb), ticket_url into prog, cur_ticket
    from festival_editions
   where festival_id = s.festival_id and year = s.edition_year
     for update;
  if not found then raise exception 'Fant ikke utgaven.'; end if;

  -- ticket_url lever på denne raden, ikke i festivals, så den tas her i
  -- stedet for gjennom apply_submission. Text-sammenligning har ikke
  -- to_jsonb-fellen fra festival_edit: NULL is distinct from NULL er false
  -- helt naturlig for en vanlig kolonne.
  if p_ops ? 'ticket_url' then
    if cur_ticket is distinct from (p_ops->'ticket_url'->>'base') then
      ticket_skipped := true;
    else
      update festival_editions
         set ticket_url = nullif(trim(p_ops->'ticket_url'->>'value'), '')
       where festival_id = s.festival_id and year = s.edition_year;
      insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
      values (s.id, s.festival_id, 'ticket_url:' || s.edition_year,
              to_jsonb(cur_ticket), p_ops->'ticket_url'->'value');
      ticket_applied := true;
    end if;
  end if;

  -- Fjern først, så flytt, så legg til. Motsatt rekkefølge ville latt en
  -- flytting fjerne navnet en tilføyelse nettopp la inn.
  for op in select * from jsonb_array_elements(coalesce(p_ops->'remove', '[]'::jsonb)) loop
    nm := op->>'name';
    for day_idx in 0 .. jsonb_array_length(prog) - 1 loop
      if prog->day_idx->>'date' = op->>'date' then
        prog := jsonb_set(prog, array[day_idx::text, 'artists'], (
          select coalesce(jsonb_agg(a), '[]'::jsonb)
          from jsonb_array_elements(prog->day_idx->'artists') a
          where artist_key(a->>'name') is distinct from artist_key(nm)
        ));
        n_remove := n_remove + 1;
      end if;
    end loop;
  end loop;

  for op in select * from jsonb_array_elements(coalesce(p_ops->'move', '[]'::jsonb)) loop
    nm := op->>'name';
    for day_idx in 0 .. jsonb_array_length(prog) - 1 loop
      if prog->day_idx->>'date' = op->>'from' then
        prog := jsonb_set(prog, array[day_idx::text, 'artists'], (
          select coalesce(jsonb_agg(a), '[]'::jsonb)
          from jsonb_array_elements(prog->day_idx->'artists') a
          where artist_key(a->>'name') is distinct from artist_key(nm)
        ));
      end if;
    end loop;
    p_ops := jsonb_set(p_ops, '{add}',
      coalesce(p_ops->'add', '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object('date', op->>'to', 'name', nm)));
    n_move := n_move + 1;
  end loop;

  for op in select * from jsonb_array_elements(coalesce(p_ops->'add', '[]'::jsonb)) loop
    nm  := trim(op->>'name');
    target := op->>'date';
    continue when nm = '' or nm is null;

    day_idx := null;
    for art_idx in 0 .. greatest(jsonb_array_length(prog) - 1, -1) loop
      if prog->art_idx->>'date' = target then day_idx := art_idx; exit; end if;
    end loop;

    -- Dagen finnes ikke i programmet ennå: opprett den.
    if day_idx is null then
      prog := prog || jsonb_build_array(jsonb_build_object(
        'date', target, 'day_label', null, 'artists', '[]'::jsonb));
      day_idx := jsonb_array_length(prog) - 1;
    end if;

    select exists (
      select 1 from jsonb_array_elements(prog->day_idx->'artists') a
       where artist_key(a->>'name') = artist_key(nm)
    ) into has_artist;

    if not has_artist then
      -- stage og time er alltid null: tekst der gjør artisten usøkbar i appen.
      prog := jsonb_set(prog, array[day_idx::text, 'artists'],
        (prog->day_idx->'artists')
        || jsonb_build_array(jsonb_build_object('name', nm, 'stage', null, 'time', null)));
      n_add := n_add + 1;
    end if;
  end loop;

  -- Sorter dagene, ellers havner en nyopprettet dag sist uansett dato.
  select coalesce(jsonb_agg(x order by x->>'date'), '[]'::jsonb)
    into prog
    from jsonb_array_elements(prog) x;

  update festival_editions
     set program = prog, source = 'community', updated_at = now()
   where festival_id = s.festival_id and year = s.edition_year;

  insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
  values (s.id, s.festival_id, 'program:' || s.edition_year,
          jsonb_build_object('ops', p_ops), prog);

  -- Hold artistregisteret i takt, så nye navn blir søkbare for neste bidragsyter.
  -- do nothing, ikke opptelling: bruksteller skal speile hvor mange programmer
  -- navnet står i, og en ny godkjenning av samme program er ikke en ny bruk.
  insert into artist_names (name, name_key, uses)
  select distinct a->>'name', lower(unaccent(a->>'name')), 1
    from jsonb_array_elements(prog) d,
         jsonb_array_elements(d->'artists') a
   where coalesce(trim(a->>'name'), '') <> ''
  on conflict (name) do nothing;

  update submissions
     set status = case
                    when n_add + n_remove + n_move = 0 and not ticket_applied then 'rejected'
                    when ticket_skipped then 'partial'
                    else 'applied'
                  end,
         reviewed_by = auth.uid(),
         review_note = p_review_note,
         reviewed_at = now()
   where id = s.id;

  return jsonb_build_object(
    'added', n_add, 'removed', n_remove, 'moved', n_move,
    'ticketApplied', ticket_applied, 'ticketSkipped', ticket_skipped
  );
end;
$$;

revoke all on function public.apply_program_submission(uuid, jsonb, text) from public, anon;
grant execute on function public.apply_program_submission(uuid, jsonb, text) to authenticated;
