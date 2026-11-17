-- En godkjent ny festival skal få med seg alt forslaget bar: også hovedsjanger
-- og undersjanger, som funksjonen ikke lagret før 17. november 2026.
--
-- Kjøres av scripts/test_sql.sh mot en engangsdatabase.

\set ON_ERROR_STOP on

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

-- `tags` ble opprettet av en engangsfil utenfor migrasjonsmappen
-- (supabase/add_tags_column.sql), så engangsdatabasen har den ikke. Uten den
-- feiler apply_new_festival i testen, selv om den virker i produksjon.
alter table public.festivals add column if not exists tags text[];

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'admin@example.org'),
  ('44444444-4444-4444-4444-444444444444', 'bidragsyter@example.org');

update public.profiles set is_admin = true
 where id = '33333333-3333-3333-3333-333333333333';

-- Et fullstendig forslag, slik roboten og skjemaet skal kunne sende det.
insert into public.submissions (id, kind, festival_id, payload, base_snapshot, submitted_by, status)
values ('cccccccc-0000-0000-0000-000000000001', 'festival_new', null,
        '{"name":"Nyfest","country":"Tyskland","city":"Hamburg","venue_name":"Stadtpark",
          "website_url":"https://nyfest.example","image_url":"https://nyfest.example/bilde.jpg",
          "tags":["Elektronisk & Dans","Techno & House"],
          "category":"Elektronisk & Dans",
          "subgenres":["techno","house"],
          "size_band":"2000_10000",
          "latitude":53.5965,"longitude":10.0087,
          "date_from":"2027-07-09","date_to":"2027-07-11","program":[]}'::jsonb,
        '{}'::jsonb, '44444444-4444-4444-4444-444444444444', 'pending');

-- Et eldre forslag uten de nye feltene skal fortsatt kunne godkjennes.
insert into public.submissions (id, kind, festival_id, payload, base_snapshot, submitted_by, status)
values ('cccccccc-0000-0000-0000-000000000002', 'festival_new', null,
        '{"name":"Gammelfest","country":"Norge","tags":["Rock"],"size_band":"200_2000",
          "latitude":59.9,"longitude":10.7,"date_from":"2027-08-01","date_to":"2027-08-02"}'::jsonb,
        '{}'::jsonb, '44444444-4444-4444-4444-444444444444', 'pending');

-- Et forslag med en ugyldig hovedsjanger skal ikke lagres.
insert into public.submissions (id, kind, festival_id, payload, base_snapshot, submitted_by, status)
values ('cccccccc-0000-0000-0000-000000000003', 'festival_new', null,
        '{"name":"Feilfest","country":"Norge","category":"Ukjent sjanger",
          "latitude":59.9,"longitude":10.7,"date_from":"2027-08-01","date_to":"2027-08-02"}'::jsonb,
        '{}'::jsonb, '44444444-4444-4444-4444-444444444444', 'pending');

select set_config('test.uid', '33333333-3333-3333-3333-333333333333', false);

/* ---------------------------------------------------------------- tester -- */

select public.apply_new_festival('cccccccc-0000-0000-0000-000000000001');

do $$
declare f record;
begin
  select * into f from public.festivals where slug = 'nyfest';
  if f.id is null then raise exception 'Nyfest ble ikke opprettet.'; end if;
  if f.category is distinct from 'Elektronisk & Dans' then
    raise exception 'Hovedsjangeren ble ikke lagret: %', f.category;
  end if;
  if f.subgenres is distinct from array['techno','house'] then
    raise exception 'Undersjangrene ble ikke lagret: %', f.subgenres;
  end if;
  -- Det som ble lagret fra før skal fortsatt være der.
  if f.size_band is distinct from '2000_10000' or f.tags is distinct from array['Elektronisk & Dans','Techno & House'] then
    raise exception 'Størrelse eller tagger forsvant: % %', f.size_band, f.tags;
  end if;
  if f.image_url is null or f.city <> 'Hamburg' or f.latitude is null then
    raise exception 'Sted eller bilde forsvant.';
  end if;
end;
$$;

select public.apply_new_festival('cccccccc-0000-0000-0000-000000000002');

do $$
declare f record;
begin
  select * into f from public.festivals where slug = 'gammelfest';
  if f.id is null then raise exception 'Gammelfest ble ikke opprettet.'; end if;
  if f.category is not null or f.subgenres is not null then
    raise exception 'Uten feltene i forslaget skal de stå tomme, fikk % og %', f.category, f.subgenres;
  end if;
end;
$$;

select pg_temp.expect_error(
  $$select public.apply_new_festival('cccccccc-0000-0000-0000-000000000003')$$,
  'festivals_category_check');

select 'nye festivaler får hovedsjanger' as resultat;

/* ------------------------------------- roboten foreslår nye festivaler ----- */

-- Roboten får foreslå, men bare fullstendige og belagte festivaler. Reglene
-- står i robot_new_festival_problem og prøves her ende til ende, gjennom
-- triggeren som faktisk møter den.

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'robot2@example.org');
update public.profiles set is_robot = true
 where id = '55555555-5555-5555-5555-555555555555';

-- Et fullstendig forslag, slik roboten skal sende det. Hver test endrer ett felt.
create or replace function pg_temp.forslag(p_endring jsonb default '{}'::jsonb)
returns jsonb
language sql
as $$
  select jsonb_strip_nulls(
    '{"name":"Robotfest","country":"Tyskland","city":"Berlin","venue_name":"Tempelhofer Feld",
      "website_url":"https://robotfest.example/","image_url":"https://robotfest.example/bilde.jpg",
      "tags":["Elektronisk & Dans"],"category":"Elektronisk & Dans","subgenres":["techno"],
      "size_band":"2000_10000","latitude":52.4732,"longitude":13.4,
      "date_from":"2999-07-09","date_to":"2999-07-11","program":[],
      "sources":{"coordinates":"JSON-LD på forsiden","dates":"JSON-LD på forsiden","image_url":"og:image på forsiden"},
      "guesses":{"size_band":"Tre scener og camping ifølge /om-oss, ligner Dekmantel men mindre.",
                 "category":"Alle bekreftede artister er techno, se line-up-siden.",
                 "tags":"Samme grunnlag: line-upen er ren techno og house.",
                 "subgenres":"Seks av ni artister er techno, ifølge line-up-siden."}}'::jsonb
    || p_endring);
$$;

create or replace function pg_temp.send(p_payload jsonb, p_note text default 'Funnet på forsiden.
GJETTET (står ikke på siden): størrelse, sjanger.', p_who uuid default '55555555-5555-5555-5555-555555555555')
returns void
language plpgsql
as $$
begin
  insert into public.submissions (kind, festival_id, payload, base_snapshot, submitted_by, source_url, confidence, note, status)
  values ('festival_new', null, p_payload, '{}'::jsonb, p_who, 'https://robotfest.example/', 'high', p_note, 'pending');
end;
$$;

-- Ett felt mangler: avvises, og meldingen sier hvilket.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"image_url":""}'))$$, 'mangler image_url');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"city":""}'))$$, 'mangler city');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"tags":[]}'))$$, 'mangler tagger');

-- Ugyldige verdier.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"category":"Techno"}'))$$, 'ikke en hovedsjanger');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"size_band":"stor"}'))$$, 'ikke et publikumstrinn');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"image_url":"http://robotfest.example/a.jpg"}'))$$, 'https');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"latitude":13.4,"longitude":52.4732}'))$$, 'utenfor Europa');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"date_from":"2020-07-09","date_to":"2020-07-11"}'))$$, 'fortiden');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"date_to":"2999-12-31"}'))$$, 'ikke en festival');

-- Intet felt uten bevis.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"sources":{"dates":"x","image_url":"x"}}'))$$, 'coordinates mangler kilde');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"guesses":{"category":"Alle bekreftede artister er techno, se line-up.","tags":"Samme grunnlag: line-upen er ren techno."}}'))$$, 'size_band er hverken belagt eller merket som gjetning');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"guesses":{"size_band":"tror det","category":"Alle bekreftede artister er techno, se line-up.","tags":"Samme grunnlag: line-upen er ren techno."}}'))$$, 'for tynn begrunnelse');
-- Gjetninger må stå i notatet, så du ser dem i køen.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag(), 'Funnet på forsiden.')$$, 'GJETTET');
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag(), '')$$, 'notat');

-- En belagt størrelse er ikke en gjetning, og trenger ikke stå som en.
select pg_temp.expect_ok($$select pg_temp.send(
  jsonb_set(jsonb_set(pg_temp.forslag('{"name":"Belagtfest","website_url":"https://belagtfest.example"}'),
                      '{guesses}', (pg_temp.forslag()->'guesses') - 'size_band'),
            '{sources,size_band}', '"Siden sier ca. 6000 gjester per dag"'))$$);
delete from public.submissions where payload->>'name' = 'Belagtfest';

-- Duplikater: samme nettsted som Nyfest (godkjent lenger opp), selv med annet
-- navn, og med www og en sti.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"name":"Noe Helt Annet","website_url":"https://www.nyfest.example/om-oss"}'))$$, 'samme nettsted');
-- Samme navn som en festival vi har.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"name":"Gammelfest","website_url":"https://ny-adresse.example"}'))$$, 'samme navn');

-- Et fullstendig, belagt, nytt forslag slipper gjennom til køen.
select pg_temp.expect_ok($$select pg_temp.send(pg_temp.forslag())$$);

do $$
declare n int;
begin
  select count(*) into n from public.submissions
   where kind = 'festival_new' and status = 'pending' and payload->>'name' = 'Robotfest';
  if n <> 1 then raise exception 'Robotfest skulle ligget i køen én gang, fikk %', n; end if;
  -- Og ingenting er opprettet. Bare et menneske kan godkjenne.
  if exists (select 1 from public.festivals where slug = 'robotfest') then
    raise exception 'Robotfest skulle ikke vært opprettet.';
  end if;
end;
$$;

-- Samme festival to ganger i køen.
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"name":"Robotfest Igjen"}'))$$, 'ligger allerede i køen');

-- Taket på tre per døgn.
select pg_temp.expect_ok($$select pg_temp.send(pg_temp.forslag('{"name":"Andre","website_url":"https://andre.example"}'))$$);
select pg_temp.expect_ok($$select pg_temp.send(pg_temp.forslag('{"name":"Tredje","website_url":"https://tredje.example"}'))$$);
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"name":"Fjerde","website_url":"https://fjerde.example"}'))$$, 'høyst 3 nye festivaler per døgn');

-- Taket på fem ubehandlede, når de er eldre enn et døgn.
update public.submissions set created_at = now() - interval '2 days'
 where kind = 'festival_new' and submitted_by = '55555555-5555-5555-5555-555555555555';
select pg_temp.expect_ok($$select pg_temp.send(pg_temp.forslag('{"name":"Femte","website_url":"https://femte.example"}'))$$);
select pg_temp.expect_ok($$select pg_temp.send(pg_temp.forslag('{"name":"Sjette","website_url":"https://sjette.example"}'))$$);
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"name":"Sjuende","website_url":"https://sjuende.example"}'))$$, 'allerede 5');

-- Et menneske er ikke underlagt noe av dette: skjemaet sender mindre.
select pg_temp.expect_ok($$
  insert into public.submissions (kind, festival_id, payload, base_snapshot, submitted_by, status)
  values ('festival_new', null, '{"name":"Menneskefest","country":"Norge","latitude":59.9,"longitude":10.7,"date_from":"2027-08-01"}'::jsonb,
          '{}'::jsonb, '44444444-4444-4444-4444-444444444444', 'pending')
$$);

-- Robotens liste over hovedsjangre skal være nøyaktig den databasen godtar.
-- Clam Rock fikk «Rock & Metal», som roboten godtok og databasen ikke, og
-- forslaget kunne ikke godkjennes.
delete from public.submissions where submitted_by = '55555555-5555-5555-5555-555555555555';
do $$
declare v text; problem text; n int := 0;
begin
  for v in
    select (regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g'))[1]
      from pg_constraint c where c.conname = 'festivals_category_check'
  loop
    n := n + 1;
    problem := public.robot_new_festival_problem(pg_temp.forslag(jsonb_build_object('category', v)), 'GJETTET', '55555555-5555-5555-5555-555555555555');
    if problem like '%hovedsjanger%' then
      raise exception 'Databasen godtar «%», men roboten avviser den.', v;
    end if;
  end loop;
  if n < 5 then raise exception 'Fant ikke lista i festivals_category_check (bare % verdier).', n; end if;
end;
$$;
select pg_temp.expect_error($$select pg_temp.send(pg_temp.forslag('{"category":"Rock & Metal"}'))$$, 'ikke en hovedsjanger');

select 'roboten foreslår nye festivaler på strenge vilkår' as resultat;
