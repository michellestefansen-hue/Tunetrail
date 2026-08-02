-- Steg 0 i docs/plan-brukerbidrag.md: lukk skrivetilgangen for publikum.
--
-- Bakgrunn: den offentlige nøkkelen ligger i nettleserbundelen -- den må
-- ligge der for at kartet skal virke -- og en PATCH mot både festivals og
-- festival_editions med den nøkkelen svarte HTTP 200. Radnivåsikkerhet var
-- altså av. Hvem som helst kunne endre eller slette hele databasen.
--
-- Etter denne migrasjonen kan publikum bare lese. All skriving må gå via
-- serveren med service-nøkkelen, som går utenom radnivåsikkerhet.
--
-- Dette brekker ingenting som finnes i dag:
--   * Kartet, festivalsidene, guidene og sitemap leser kun.
--   * api/enrich er det eneste stedet appen skriver, og den bruker allerede
--     SUPABASE_SERVICE_ROLE_KEY (se src/app/api/enrich/route.ts).
--   * SQL-filene i supabase/ kjøres i SQL-editoren, som også går utenom.
--
-- Kun disse to tabellene er eksponert på REST-API-et; ingen andre er sjekket
-- inn under samme risiko.

alter table public.festivals         enable row level security;
alter table public.festival_editions enable row level security;

-- Rydd bort eventuelle eksisterende policyer, så resultatet blir det samme
-- uansett hva som lå der fra før.
drop policy if exists "public read festivals"          on public.festivals;
drop policy if exists "public read festival_editions"  on public.festival_editions;

create policy "public read festivals"
  on public.festivals
  for select
  to anon, authenticated
  using (true);

create policy "public read festival_editions"
  on public.festival_editions
  for select
  to anon, authenticated
  using (true);

-- Bevisst utelatt: ingen insert-, update- eller delete-policy. Uten en policy
-- for en operasjon er den nektet når radnivåsikkerhet er på. Skriveadgang
-- kommer tilbake i neste steg, men da bare for innloggede brukere og bare mot
-- forslagstabellen -- aldri direkte mot disse to.

-- Andre lag. Målingen før migrasjonen viste at INSERT allerede var nektet,
-- mens UPDATE og DELETE gikk gjennom -- altså er tabellrettighetene delvis
-- satt opp fra før. Radnivåsikkerhet alene ville holdt, men uten rettigheten
-- i bunn blir en fremtidig policy som er for romslig ufarlig i seg selv.
revoke insert, update, delete, truncate
  on public.festivals, public.festival_editions
  from anon, authenticated;

grant select
  on public.festivals, public.festival_editions
  to anon, authenticated;
