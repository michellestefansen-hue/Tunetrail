-- Steg 2 i docs/plan-brukerbidrag.md: hvem er du, og er du admin.
--
-- Supabase har allerede en auth.users-tabell, men den skal man ikke lese fra
-- appen. profiles er vår egen, offentlig lesbare del: navnet som vises på et
-- bidrag, om du er administrator, og hvor mye vi stoler på deg.
--
-- Raden lages automatisk ved første innlogging, så ingen kan havne i en
-- tilstand der de er logget inn uten profil.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  is_admin      boolean     not null default false,
  trust_level   int         not null default 0,
  created_at    timestamptz not null default now()
);

comment on column public.profiles.trust_level is
  '0 = alt til godkjenning. 1 = programtilføyelser går rett inn, fjerninger og '
  'flyttinger fortsatt til kø. Heves manuelt.';

-- Lag profilen i det brukeren opprettes. security definer fordi triggeren
-- skriver til public.profiles på vegne av en bruker som ennå ikke har rettigheter.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Samme prinsipp som festivals: på med radnivåsikkerhet, og bare det som
-- trengs slippes gjennom.
alter table public.profiles enable row level security;

drop policy if exists "les profiler"      on public.profiles;
drop policy if exists "rediger eget navn" on public.profiles;

-- Visningsnavn er offentlig fordi det skal stå «foreslått av» på et bidrag.
create policy "les profiler"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Du kan endre ditt eget navn, men ikke gjøre deg selv til admin: with check
-- krever at is_admin og trust_level er uendret.
create policy "rediger eget navn"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin    = (select p.is_admin    from public.profiles p where p.id = auth.uid())
    and trust_level = (select p.trust_level from public.profiles p where p.id = auth.uid())
  );

-- Ingen insert- eller delete-policy: rader lages av triggeren og forsvinner
-- med brukeren.
revoke insert, delete, truncate on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ETTER at du har logget inn første gang, gjør deg selv til administrator.
-- Kjør denne linja alene, med din egen e-post:
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'michellestefansen@gmail.com');
