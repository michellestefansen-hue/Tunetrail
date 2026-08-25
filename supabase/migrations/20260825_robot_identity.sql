-- Roboten som en bruker, ikke som en bakdør.
--
-- Steg 1 og 4 i docs/plan-2027-oppdatering.md. Nattjobben som skal fylle inn
-- 2027 sender forslag på nøyaktig samme måte som et menneske: en rad i
-- submissions, som ligger der til den er godkjent. Ingenting nytt trengs for
-- å skrive den inn -- apply_program_submission gjør allerede jobben.
--
-- Det som trengs er tre ting basen ikke kan svare på i dag:
--   * hvem av profilene er en robot (så SQL kan behandle den strengere)
--   * hvor sikker var den (så køen kan rute på tvil, ikke bare på operasjon)
--   * ...og at den faktisk oppga hvor den hadde det fra.

-- En robot er ikke et tillitsnivå. trust_level sier hvor mye vi stoler på
-- innsenderen; is_robot sier hva slags innsender det er. En robot kan bli
-- betrodd uten å slutte å være en robot, og reglene under gjelder uansett nivå.
alter table public.profiles
  add column if not exists is_robot boolean not null default false;

comment on column public.profiles.is_robot is
  'Sann for nattjobber. Utløser strengere regler i guard_robot_submission, '
  'og bestemmer om et program regnes som menneskeberørt.';

-- Sikkerhet er en tilstand, ikke en formulering.
--
-- Roboten kunne skrevet «jeg er litt usikker» i note, men fritekst kan ikke
-- rutes på. Uten en kolonne ser en usikker tilføyelse nøyaktig ut som en
-- sikker -- og da går begge samme vei den dagen tilføyelser går rett inn.
alter table public.submissions
  add column if not exists confidence text
  check (confidence is null or confidence in ('high','low'));

comment on column public.submissions.confidence is
  'null for mennesker. Obligatorisk for roboter: high = kandidat til '
  'automatisk innlegging, low = skal alltid innom køen.';

-- Køen sorterer på tvil før den sorterer på alder, når den dagen kommer.
create index if not exists submissions_pending_confidence_idx
  on public.submissions (confidence, created_at)
  where status = 'pending';

/* --------------------------------------------- reglene rundt fjerning ---- */

-- Hva som er galt med en fjerning, eller null hvis ingenting er det.
--
-- Skilt ut fra triggeren med vilje. Fjerning er stengt for roboten inntil
-- videre (se guard_robot_submission), og regler som aldri kjøres er regler
-- ingen vet om virker. Som egen funksjon kan de prøves i dag, lenge før
-- dagen de skal begynne å gjelde.
create or replace function public.robot_removal_problem(
  p_festival_id uuid,
  p_year        int,
  p_payload     jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- En ekte avlysningsbølge er små tall. Et stort tall er en feil ved døra:
  -- feil underside, en cookie-vegg, et JavaScript-skall.
  max_removals     constant int := 5;
  max_removal_frac constant numeric := 0.20;

  n_remove      int;
  stored_count  int;
  found_count   int;
  human_touched boolean;
  op            jsonb;
begin
  n_remove := jsonb_array_length(coalesce(p_payload->'remove', '[]'::jsonb));
  if n_remove = 0 then
    return null;
  end if;

  select count(*) into stored_count
    from public.festival_editions e,
         lateral jsonb_array_elements(coalesce(e.program, '[]'::jsonb)) d,
         lateral jsonb_array_elements(coalesce(d->'artists', '[]'::jsonb)) a
   where e.festival_id = p_festival_id
     and e.year = p_year;

  -- Roboten må si hvor mange navn den fant på siden. Dette ene punktet fanger
  -- nesten alle katastrofene: ei side som gir 8 navn der basen har 60 er ikke
  -- en lineup som har krympet, det er en side vi ikke fikk lest. Å kreve
  -- tallet gjør «glemte å sjekke» til en annen og synligere feil enn
  -- «sjekket, og tok feil».
  found_count := nullif(p_payload->>'found_count', '')::int;
  if found_count is null then
    return 'Fjerning krever found_count: hvor mange navn roboten faktisk fant på siden.';
  end if;
  if found_count < stored_count then
    return format(
      'Siden ga %s navn, basen har %s -- for få til at en fjerning kan stoles på.',
      found_count, stored_count);
  end if;

  if n_remove > max_removals then
    return format('Roboten kan fjerne høyst %s navn om gangen (ba om %s).',
                  max_removals, n_remove);
  end if;
  if stored_count > 0 and n_remove::numeric / stored_count > max_removal_frac then
    return format('Roboten kan fjerne høyst %s %% av programmet (ba om %s av %s).',
                  (max_removal_frac * 100)::int, n_remove, stored_count);
  end if;

  -- Rørte et menneske dette programmet sist, er det fredet for fjerning.
  -- Bidragsyteren kan ha vært på festivalen, eller følge artisten; en
  -- nettside vet ikke alltid mest.
  --
  -- Ingen revisjonsrad betyr at programmet kom fra seed-filene, altså fra
  -- håndarbeid. Det er den mest menneskelige dataen vi har, så fravær av spor
  -- teller som menneske -- ikke som fritt fram.
  select not coalesce(p.is_robot, false) into human_touched
    from public.submission_audit sa
    join public.submissions s2 on s2.id = sa.submission_id
    join public.profiles    p  on p.id  = s2.submitted_by
   where sa.festival_id = p_festival_id
     and sa.field = 'program:' || p_year
   order by sa.applied_at desc
   limit 1;

  if coalesce(human_touched, true) then
    return format(
      'Programmet for %s ble sist endret av et menneske. Roboten kan legge til, ikke fjerne.',
      p_year);
  end if;

  -- «Sto ikke på siden» er fravær av bevis, ikke bevis. Hver fjerning må peke
  -- på noe som faktisk sier at artisten er ute.
  for op in select * from jsonb_array_elements(p_payload->'remove') loop
    if coalesce(trim(op->>'reason'), '') = '' then
      return format('Fjerning av «%s» mangler begrunnelse.', op->>'name');
    end if;
  end loop;

  return null;
end;
$$;

/* -------------------------------------------------------------- vakten --- */

-- Prompten sier hva roboten bør. Denne sier hva den kan.
--
-- Hele poenget med å legge reglene her og ikke i instruksen er at en modell
-- som glemmer en instruks skal møte en vegg. Avvisningen skjer ved insert og
-- ikke ved godkjenning: et forslag som aldri kan godkjennes skal ikke fylle
-- køen din i mellomtiden.
create or replace function public.guard_robot_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Fjerning er stengt. Reglene i robot_removal_problem er skrevet og prøvd,
  -- men roboten skal ha bygget programmer i månedsvis før den får lov til å
  -- rive i dem. Å åpne er å endre denne ene linja.
  robot_may_remove constant boolean := false;

  is_robot boolean;
  n_remove int;
  n_move   int;
  problem  text;
begin
  select p.is_robot into is_robot
    from public.profiles p where p.id = new.submitted_by;

  if not coalesce(is_robot, false) then
    return new;
  end if;

  -- Uten en lenke er forslaget ikke etterprøvbart, og et robotforslag du ikke
  -- kan etterprøve er verdiløst -- da må du finne kilden selv uansett.
  if coalesce(trim(new.source_url), '') = '' then
    raise exception 'Roboten må oppgi source_url.';
  end if;

  if new.confidence is null then
    raise exception 'Roboten må oppgi confidence (high eller low).';
  end if;

  -- Roboten fyller ut år og programmer. Å opprette festivaler er en annen
  -- jobb, med duplikater som hovedrisiko, og den er ikke vurdert her.
  if new.kind = 'festival_new' then
    raise exception 'Roboten kan ikke opprette festivaler.';
  end if;

  if new.kind <> 'program_edit' then
    return new;
  end if;

  n_remove := jsonb_array_length(coalesce(new.payload->'remove', '[]'::jsonb));
  n_move   := jsonb_array_length(coalesce(new.payload->'move',   '[]'::jsonb));

  -- En flytting er en fjerning med et ekstra steg: navnet forsvinner fra den
  -- ene dagen uansett hva som skjer med den andre. Den følger derfor samme
  -- sperre, i stedet for å bli smutthullet rundt den.
  if n_move > 0 and not robot_may_remove then
    raise exception 'Roboten kan ikke flytte artister (flytting er fjerning med et ekstra steg).';
  end if;

  if n_remove > 0 then
    if not robot_may_remove then
      raise exception 'Roboten kan ikke fjerne artister.';
    end if;
    problem := public.robot_removal_problem(new.festival_id, new.edition_year, new.payload);
    if problem is not null then
      raise exception '%', problem;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_robot_submission on public.submissions;
create trigger guard_robot_submission
  before insert on public.submissions
  for each row execute function public.guard_robot_submission();
