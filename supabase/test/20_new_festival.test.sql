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
