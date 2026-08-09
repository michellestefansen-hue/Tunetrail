-- Datoer som passasjer på programforslaget, og et nytt år som følge av det.
--
-- Å legge til et år er ikke en endring av en rad, det er en ny rad -- samme
-- forskjell som mellom å redigere og å opprette en festival. Fram til nå ga
-- funksjonen «Fant ikke utgaven» og stoppet.
--
-- Løsningen følger presedensen fra ticket_url: datoene bor på utgaven, så de
-- rir med programforslaget i stedet for å få en egen innsendingstype. Én
-- køoppføring, én skjerm å godkjenne i. «Legg til 2027 med datoer og lineup» er
-- én intensjon, ikke to.
--
--   dates: { from, to, base: { from, to } | null }
--
-- `base: null` betyr «utgaven fantes ikke da jeg sendte inn». Da opprettes den.
-- Har noen andre rukket å opprette året i mellomtiden, blir det en konflikt du
-- får se -- ikke en overskriving. Samme disiplin som de vanlige feltene.
--
-- Resten av funksjonen er uendret fra 20260802_apply_program.sql.

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
  edition_found  boolean;
  cur_from       date;
  cur_to         date;
  base_is_new    boolean;
  dates_applied  boolean := false;
  dates_skipped  boolean := false;
  created        boolean := false;
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

  select coalesce(program, '[]'::jsonb), ticket_url, date_from, date_to
    into prog, cur_ticket, cur_from, cur_to
    from festival_editions
   where festival_id = s.festival_id and year = s.edition_year
     for update;
  edition_found := found;

  -- Manglet «from» eller «to» i basen, ville et tomt objekt her sett ut som
  -- «ingen endring». coalesce til JSON-null gjør de to skillbare.
  base_is_new := coalesce(p_ops->'dates'->'base', 'null'::jsonb) = 'null'::jsonb;

  if not edition_found then
    -- Uten datoer finnes det ingenting å opprette raden med, og en utgave uten
    -- datoer er usynlig i appen -- listen viser bare det som kommer.
    if not (p_ops ? 'dates') then
      raise exception 'Fant ikke utgaven %, og forslaget har ingen datoer å opprette den med.',
        s.edition_year;
    end if;

    insert into festival_editions (
      festival_id, year, date_from, date_to, ticket_url, program, source
    )
    values (
      s.festival_id, s.edition_year,
      (p_ops->'dates'->>'from')::date,
      (p_ops->'dates'->>'to')::date,
      null, '[]'::jsonb, 'community'
    );
    prog := '[]'::jsonb;
    cur_ticket := null;
    dates_applied := true;
    created := true;

    insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
    values (s.id, s.festival_id, 'edition_new:' || s.edition_year,
            null, p_ops->'dates');

  elsif p_ops ? 'dates' then
    if base_is_new then
      -- Forslaget mente å opprette året, men noen andre kom først. Datoene
      -- deres kan være riktigere, så de blir stående og dette flagges.
      dates_skipped := true;
    elsif cur_from is distinct from (p_ops->'dates'->'base'->>'from')::date
       or cur_to   is distinct from (p_ops->'dates'->'base'->>'to')::date then
      dates_skipped := true;
    else
      update festival_editions
         set date_from = (p_ops->'dates'->>'from')::date,
             date_to   = (p_ops->'dates'->>'to')::date
       where festival_id = s.festival_id and year = s.edition_year;

      insert into submission_audit (submission_id, festival_id, field, old_value, new_value)
      values (s.id, s.festival_id, 'dates:' || s.edition_year,
              jsonb_build_object('from', cur_from, 'to', cur_to),
              jsonb_build_object('from', p_ops->'dates'->>'from',
                                 'to',   p_ops->'dates'->>'to'));
      dates_applied := true;
    end if;
  end if;

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
                    when n_add + n_remove + n_move = 0
                     and not ticket_applied and not dates_applied then 'rejected'
                    when ticket_skipped or dates_skipped then 'partial'
                    else 'applied'
                  end,
         reviewed_by = auth.uid(),
         review_note = p_review_note,
         reviewed_at = now()
   where id = s.id;

  return jsonb_build_object(
    'added', n_add, 'removed', n_remove, 'moved', n_move,
    'ticketApplied', ticket_applied, 'ticketSkipped', ticket_skipped,
    'datesApplied', dates_applied, 'datesSkipped', dates_skipped,
    'editionCreated', created
  );
end;
$$;

revoke all on function public.apply_program_submission(uuid, jsonb, text) from public, anon;
grant execute on function public.apply_program_submission(uuid, jsonb, text) to authenticated;
