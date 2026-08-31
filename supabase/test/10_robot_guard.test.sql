-- Reglene roboten ikke kommer rundt.
--
-- Dette er den ene fila i prosjektet det er verdt å teste for hånd. Alt annet
-- roboten gjør kan rettes i etterkant -- et navn for mye i et program er to
-- sekunders arbeid. Fjerner den derimot 40 navn et menneske har lagt inn, er
-- de borte, og du vet ikke engang at de var der.
--
-- Kjøres av scripts/test_sql.sh mot en engangsdatabase.

\set ON_ERROR_STOP on

/* ------------------------------------------------------------- stillas --- */

create or replace function pg_temp.expect_error(p_sql text, p_fragment text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_fragment) in lower(sqlerrm)) = 0 then
      raise exception 'Feil melding. Ventet «%», fikk «%»', p_fragment, sqlerrm;
    end if;
    return;
  end;
  raise exception 'Ventet at dette skulle bli avvist, men det gikk gjennom: %', p_sql;
end;
$$;

create or replace function pg_temp.expect_ok(p_sql text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
end;
$$;

/* ------------------------------------------------------------- fikstur --- */

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'menneske@example.org'),
  ('22222222-2222-2222-2222-222222222222', 'robot@tune-trail.org');

-- Triggeren on_auth_user_created har laget profilradene. Her settes bare det
-- som skiller dem.
update public.profiles set is_robot = true
 where id = '22222222-2222-2222-2222-222222222222';

insert into public.festivals (id, name, slug, website_url) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Testfest',  'testfest',  'https://testfest.example'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Tomfest',   'tomfest',   'https://tomfest.example'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Ingenfest', 'ingenfest', 'https://ingenfest.example'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Endretfest','endretfest','https://endretfest.example');

-- Testfest har et program på fem navn. Tomfest har en utgave uten program.
-- Ingenfest har ingen 2027-utgave i det hele tatt.
insert into public.festival_editions (festival_id, year, date_from, date_to, program, source) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 2027, '2027-06-10', '2027-06-12',
   '[{"date":"2027-06-10","day_label":null,"artists":[
       {"name":"Aurora","stage":null,"time":null},
       {"name":"Bjork","stage":null,"time":null},
       {"name":"CMAT","stage":null,"time":null},
       {"name":"Dua Lipa","stage":null,"time":null},
       {"name":"Enslaved","stage":null,"time":null}]}]'::jsonb, 'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 2027, '2027-07-01', '2027-07-03',
   '[]'::jsonb, 'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 2027, '2027-05-01', '2027-05-03',
   '[]'::jsonb, 'manual');

insert into public.festival_watch (festival_id, url, checked_at, changed_at, pending) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'https://testfest.example',  now(), null, false),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'https://tomfest.example',   now(), null, false),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'https://ingenfest.example', now(), null, false),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'https://endretfest.example',now(), now(), true);

/* ------------------------------------------------- mennesker rører ikke --- */

-- Vakten gjelder roboter. Et menneske skal fortsatt kunne sende inn et
-- programforslag uten kilde og uten å si hvor sikker det er -- slik skjemaet
-- har fungert hele tiden.
select pg_temp.expect_ok($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[{"date":"2027-06-10","name":"Fever Ray"}],"remove":[],"move":[]}'::jsonb,
          '11111111-1111-1111-1111-111111111111')
$$);

-- Og et menneske kan fortsatt fjerne. Det er nettopp mennesker vi stoler på
-- til dette.
select pg_temp.expect_ok($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[],"remove":[{"date":"2027-06-10","name":"Aurora"}],"move":[]}'::jsonb,
          '11111111-1111-1111-1111-111111111111')
$$);

/* --------------------------------------------------- roboten må vise kort - */

select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[{"date":"2027-06-10","name":"Fever Ray"}],"remove":[],"move":[]}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'high')
$$, 'source_url');

select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[{"date":"2027-06-10","name":"Fever Ray"}],"remove":[],"move":[]}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'https://testfest.example/lineup')
$$, 'confidence');

-- «Ganske sikker» finnes ikke. To verdier, slik at køen kan rute på dem.
select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[],"remove":[],"move":[]}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'https://testfest.example/lineup', 'medium')
$$, 'confidence');

-- Å opprette festivaler er en annen jobb, med duplikater som hovedrisiko.
select pg_temp.expect_error($$
  insert into public.submissions (kind, payload, submitted_by, source_url, confidence)
  values ('festival_new', '{"name":"Oppdiktet festival"}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'https://example.org', 'high')
$$, 'kan ikke opprette festivaler');

/* ------------------------------------------------ det roboten faktisk får - */

select pg_temp.expect_ok($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence, note)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[{"date":"2027-06-10","name":"Fever Ray"}],"remove":[],"move":[]}'::jsonb,
          '22222222-2222-2222-2222-222222222222',
          'https://testfest.example/lineup', 'high', 'Sto under «Line-up 2027».')
$$);

-- Datoer for et år som ikke finnes: dette er hele fase 1.
select pg_temp.expect_ok($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000003', 2027,
          '{"add":[],"remove":[],"move":[],"dates":{"from":"2027-08-01","to":"2027-08-03","base":null}}'::jsonb,
          '22222222-2222-2222-2222-222222222222',
          'https://ingenfest.example', 'high')
$$);

/* --------------------------------------------------------- og det ikke ---- */

select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[],"remove":[{"date":"2027-06-10","name":"Aurora","reason":"avlyst"}],"move":[]}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'https://testfest.example/lineup', 'high')
$$, 'kan ikke fjerne artister');

-- En flytting er en fjerning med et ekstra steg. Den skal ikke være
-- smutthullet rundt sperren over.
select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000001', 2027,
          '{"add":[],"remove":[],"move":[{"from":"2027-06-10","to":"2027-06-11","name":"Aurora"}]}'::jsonb,
          '22222222-2222-2222-2222-222222222222', 'https://testfest.example/lineup', 'high')
$$, 'kan ikke flytte');

/* ----------------------------------------------------------- utvalget ---- */

-- Ryddig utgangspunkt: forslagene over ville ellers stengt festivalene ute av
-- utvalget, som er nøyaktig det de skal gjøre -- men det testes for seg under.
delete from public.submissions;

do $$
declare picked text[];
begin
  select array_agg(slug order by ord) into picked
    from (select slug, row_number() over () as ord from public.next_for_ai(10, 2027)) t;

  -- Endretfest står først fordi vakten har sett en endring. Deretter den som
  -- mangler utgaven helt, så den med tom utgave, så den som allerede har et
  -- program.
  if picked <> array['endretfest','ingenfest','tomfest','testfest'] then
    raise exception 'Feil rekkefølge fra next_for_ai: %', picked;
  end if;
end;
$$;

-- Innen samme bøtte skal året bestemme, ikke alfabetet.
--
-- Første ekte kjøring ga «24 heures», «7th Sunday», «Å-festival», «Aarhus»,
-- «Aberdeen» -- rett alfabetisk, fordi ingen av dem hadde en dato å sortere
-- på. Med 600 slike ville vårfestivalene stått upubliserte til roboten kom
-- til V.
insert into public.festivals (id, name, slug, website_url) values
  ('aaaaaaaa-0000-0000-0000-000000000011', 'Aaugustfest', 'aaugustfest', 'https://aug.example'),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'Ømarsfest',   'omarsfest',   'https://mar.example');

-- Ingen av dem har 2027. Begge har en 2026-utgave som sier når på året de går.
insert into public.festival_editions (festival_id, year, date_from, date_to, program, source) values
  ('aaaaaaaa-0000-0000-0000-000000000011', 2026, '2026-08-20', '2026-08-22', '[]'::jsonb, 'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000012', 2026, '2026-03-05', '2026-03-07', '[]'::jsonb, 'manual');

insert into public.festival_watch (festival_id, url, checked_at, pending) values
  ('aaaaaaaa-0000-0000-0000-000000000011', 'https://aug.example', now(), false),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'https://mar.example', now(), false);

do $$
declare mars int; august int;
begin
  select ord into mars from (
    select slug, row_number() over () as ord from public.next_for_ai(20, 2027)
  ) t where slug = 'omarsfest';
  select ord into august from (
    select slug, row_number() over () as ord from public.next_for_ai(20, 2027)
  ) t where slug = 'aaugustfest';

  if mars is null or august is null then
    raise exception 'Begge skulle vært med i utvalget.';
  end if;
  if mars > august then
    raise exception 'Marsfestivalen skulle kommet før augustfestivalen (mars %, august %).',
      mars, august;
  end if;
end;
$$;

-- Og forrige utgave følger med, så roboten kan kjenne igjen en dato som ikke
-- kan stemme: gikk festivalen i mars hvert år, er «desember 2027» en
-- feillesning og ikke en nyhet.
do $$
declare r record;
begin
  select * into r from public.next_for_ai(20, 2027) where slug = 'omarsfest';
  if r.last_year <> 2026 or r.last_from <> '2026-03-05'::date then
    raise exception 'Forrige utgave mangler eller er feil: % %', r.last_year, r.last_from;
  end if;
end;
$$;

-- Ligger det allerede et ubehandlet forslag for året, skal festivalen ut av
-- utvalget. Ellers blir det to rader i køen som sier det samme.
insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000003', 2027,
        '{"add":[],"remove":[],"move":[],"dates":{"from":"2027-08-01","to":"2027-08-03","base":null}}'::jsonb,
        '22222222-2222-2222-2222-222222222222', 'https://ingenfest.example', 'high');

do $$
declare n int;
begin
  select count(*) into n from public.next_for_ai(10, 2027) where slug = 'ingenfest';
  if n <> 0 then raise exception 'Ingenfest skulle vært utelatt: den har et forslag på vent.'; end if;
end;
$$;

-- En side roboten så på i går skal ikke komme opp igjen i natt...
update public.festival_watch set ai_checked_at = now() - interval '2 days'
 where festival_id = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
declare n int;
begin
  select count(*) into n from public.next_for_ai(10, 2027, 14) where slug = 'testfest';
  if n <> 0 then raise exception 'Testfest ble sett på for to dager siden og skulle ligget over.'; end if;
end;
$$;

-- ...med mindre vakten har sett siden endre seg etterpå. Da er det nettopp da
-- den skal tilbake.
update public.festival_watch set changed_at = now()
 where festival_id = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
declare n int;
begin
  select count(*) into n from public.next_for_ai(10, 2027, 14) where slug = 'testfest';
  if n <> 1 then raise exception 'Testfest endret seg etter forrige gjennomgang og skulle vært med.'; end if;
end;
$$;

select 'robotvakten holder' as resultat;

/* ------------------------------------- reglene for den dagen den åpnes ---- */

-- guard_robot_submission avviser all fjerning i dag, så reglene under den
-- ville aldri blitt kjørt. Derfor bor de i robot_removal_problem, og prøves
-- her direkte -- lenge før dagen de skal begynne å gjelde.

create or replace function pg_temp.removal(p_n int, p_found int, p_reason boolean)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'add', '[]'::jsonb,
    'move', '[]'::jsonb,
    'found_count', p_found,
    'remove', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'date', '2027-09-01',
               'name', 'Artist ' || g,
               'reason', case when p_reason
                              then 'avlyst ifølge festivalens egen melding'
                              else null end))), '[]'::jsonb)
        from generate_series(1, p_n) g));
$$;

create or replace function pg_temp.expect_problem(p_payload jsonb, p_fragment text)
returns void
language plpgsql
as $$
declare got text;
begin
  got := public.robot_removal_problem('aaaaaaaa-0000-0000-0000-000000000005', 2027, p_payload);
  if got is null then
    raise exception 'Ventet en innvending om «%», men fjerningen slapp gjennom.', p_fragment;
  end if;
  if position(lower(p_fragment) in lower(got)) = 0 then
    raise exception 'Feil innvending. Ventet «%», fikk «%»', p_fragment, got;
  end if;
end;
$$;

-- Storfest: 30 navn, nok til at grensen på antall og grensen på andel kan
-- prøves hver for seg. Ved 30 lagrede er 20 % seks navn, og taket på fem
-- slår inn først -- det er meningen, den strengeste av dem skal vinne.
insert into public.festivals (id, name, slug, website_url)
values ('aaaaaaaa-0000-0000-0000-000000000005', 'Storfest', 'storfest', 'https://storfest.example');

insert into public.festival_editions (festival_id, year, date_from, date_to, program, source)
select 'aaaaaaaa-0000-0000-0000-000000000005', 2027, '2027-09-01', '2027-09-02',
       jsonb_build_array(jsonb_build_object(
         'date', '2027-09-01', 'day_label', null,
         'artists', (select jsonb_agg(jsonb_build_object(
                       'name', 'Artist ' || g, 'stage', null, 'time', null))
                       from generate_series(1, 30) g))),
       'manual';

-- Ingen fjerning er ingen innvending.
do $$
begin
  if public.robot_removal_problem('aaaaaaaa-0000-0000-0000-000000000005', 2027,
       '{"add":[],"remove":[],"move":[]}'::jsonb) is not null then
    raise exception 'Et forslag uten fjerninger skal ikke ha innvendinger.';
  end if;
end;
$$;

-- Uten å si hvor mange navn den fant, får den ikke fjerne noe.
select pg_temp.expect_problem(pg_temp.removal(1, null, true), 'found_count');

-- Regelen som fanger nesten alt: færre navn på siden enn i basen betyr at
-- siden ikke ble lest, ikke at lineupen har krympet.
select pg_temp.expect_problem(pg_temp.removal(1, 8, true), 'for få');

-- Over taket på antall.
select pg_temp.expect_problem(pg_temp.removal(6, 30, true), 'høyst 5 navn');

-- Over taket på andel: to av fem på Testfest er 40 %.
do $$
declare got text;
begin
  got := public.robot_removal_problem('aaaaaaaa-0000-0000-0000-000000000001', 2027,
           '{"add":[],"move":[],"found_count":5,"remove":[
              {"date":"2027-06-10","name":"Aurora","reason":"avlyst"},
              {"date":"2027-06-10","name":"Bjork","reason":"avlyst"}]}'::jsonb);
  if got is null or position('20 %' in got) = 0 then
    raise exception 'Ventet at 2 av 5 skulle stoppes på andel, fikk: %', coalesce(got, 'ingenting');
  end if;
end;
$$;

-- Fredet: ingen revisjonsrad betyr at programmet kom fra håndarbeid.
select pg_temp.expect_problem(pg_temp.removal(3, 30, true), 'menneske');

-- Har roboten selv bygget programmet sist, er det ikke lenger fredet.
insert into public.submissions (id, kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'program_edit',
        'aaaaaaaa-0000-0000-0000-000000000005', 2027,
        '{"add":[{"date":"2027-09-01","name":"Artist 31"}],"remove":[],"move":[]}'::jsonb,
        '22222222-2222-2222-2222-222222222222', 'https://storfest.example', 'high');

insert into public.submission_audit (submission_id, festival_id, field, old_value, new_value)
values ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000005', 'program:2027', null, '[]'::jsonb);

-- ...men da må hver fjerning fortsatt si hvorfor. «Sto ikke på siden» er
-- fravær av bevis, ikke bevis.
select pg_temp.expect_problem(pg_temp.removal(3, 30, false), 'mangler begrunnelse');

-- Alt på plass: tre navn av tretti, siden ga flere enn basen har, roboten
-- bygget programmet selv, og hver fjerning har en begrunnelse.
do $$
declare got text;
begin
  got := public.robot_removal_problem('aaaaaaaa-0000-0000-0000-000000000005', 2027,
           pg_temp.removal(3, 30, true));
  if got is not null then
    raise exception 'En velbegrunnet fjerning skulle gått gjennom, men: %', got;
  end if;
end;
$$;

-- Og selv da er den stengt i triggeren, som er der den faktisk møter roboten.
select pg_temp.expect_error($$
  insert into public.submissions (kind, festival_id, edition_year, payload, submitted_by, source_url, confidence)
  values ('program_edit', 'aaaaaaaa-0000-0000-0000-000000000005', 2027,
          (select pg_temp.removal(3, 30, true)),
          '22222222-2222-2222-2222-222222222222', 'https://storfest.example', 'high')
$$, 'kan ikke fjerne artister');

select 'fjerningsreglene holder' as resultat;
