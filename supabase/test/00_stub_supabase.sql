-- Nok av Supabase til at migrasjonene kan kjøres mot en tom PostgreSQL.
--
-- Migrasjonene i supabase/migrations er skrevet for Supabase, som har et
-- auth-skjema, tre innebygde roller og en auth.uid() som leser fra JWT-en.
-- Ingenting av det finnes i en vanlig database. Denne fila lager akkurat nok
-- av det til at resten kan kjøres og prøves -- ikke en etterligning av
-- Supabase, bare stillaset migrasjonene lener seg på.
--
-- Brukes kun av scripts/test_sql.sh. Kjøres aldri mot produksjon.

-- Supabase har disse slått på fra før. Migrasjonene oppretter dem der de
-- trengs, men rekkefølgen mellom dem gjør at unaccent brukes i en fil som
-- kjøres før den som oppretter den -- i Supabase merkes det ikke.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create role anon;
create role authenticated;
create role service_role;

create schema if not exists auth;

create table auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

-- I Supabase leser denne fra JWT-en. I testen settes den for hånd, så en test
-- kan si «nå er jeg administrator» og «nå er jeg ingen».
--
--   select set_config('test.uid', '<uuid>', false);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
