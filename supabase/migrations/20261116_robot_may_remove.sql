-- Roboten får lov til å FORESLÅ fjerning og flytting av artister.
--
-- Den godkjenner aldri selv: forslaget havner i køen din, der hver artist har
-- sin egen hake. Dette åpner bare for at forslaget kan skrives.
--
-- Sperren var én linje (`robot_may_remove` i guard_robot_submission), og
-- reglene for den dagen den åpnes sto allerede klare i robot_removal_problem.
-- To ting måtte rettes samtidig, ellers ville det å åpne vært farligere enn det
-- så ut:
--
-- 1. FLYTTING SLAPP GJENNOM UTEN KONTROLL. Triggeren sjekket bare
--    robot_removal_problem for `remove`. Med sperren åpnet ville en flytting
--    ikke vært underlagt noen av reglene -- ikke taket på fem, ikke fredningen
--    av menneskebygde programmer, ikke kravet om begrunnelse. «Flytting er en
--    fjerning med et ekstra steg» sto i kommentaren, men ikke i koden. Nå teller
--    en flytting som en endring på linje med en fjerning.
--
-- 2. found_count-REGELEN STENGTE UT ALLE REELLE FJERNINGER. Den sa at siden må
--    gi minst like mange navn som basen har. Men en avlysning gjør at siden gir
--    ett navn mindre enn basen, og et navn roboten la inn ved en feil (en
--    journalists byline, en sponsor) står heller aldri på siden. Begge deler
--    ville gitt «for få». Bare en erstatning, der siden har et nytt navn for
--    hvert som forsvinner, kunne passert.
--
--    Det regelen skal fange er en side som ikke ble lest (cookie-vegg,
--    JavaScript-skall: 8 navn der basen har 60). Det fanges like godt av at
--    siden må vise ALLE navnene som blir stående, altså
--    found_count >= lagrede - fjernede. 8 mot 60 faller fortsatt gjennom.
--
-- Ellers er reglene uendret: høyst 5 endringer og høyst 20 % av programmet per
-- forslag, programmer et menneske sist rørte er fredet, og hver endring må ha
-- en begrunnelse.
--
-- Nytt her: fjerning og flytting krever confidence «high». Tvil er ikke grunn
-- nok til å ta noe bort (docs/plan-2027-oppdatering.md punkt 8).

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
  n_move        int;
  n_changes     int;
  stored_count  int;
  found_count   int;
  human_touched boolean;
  op            jsonb;
begin
  n_remove  := jsonb_array_length(coalesce(p_payload->'remove', '[]'::jsonb));
  n_move    := jsonb_array_length(coalesce(p_payload->'move',   '[]'::jsonb));
  n_changes := n_remove + n_move;
  if n_changes = 0 then
    return null;
  end if;

  select count(*) into stored_count
    from public.festival_editions e,
         lateral jsonb_array_elements(coalesce(e.program, '[]'::jsonb)) d,
         lateral jsonb_array_elements(coalesce(d->'artists', '[]'::jsonb)) a
   where e.festival_id = p_festival_id
     and e.year = p_year;

  -- Roboten må si hvor mange navn den fant på siden. Å kreve tallet gjør
  -- «glemte å sjekke» til en annen og synligere feil enn «sjekket, og tok feil».
  found_count := nullif(p_payload->>'found_count', '')::int;
  if found_count is null then
    return 'Fjerning og flytting krever found_count: hvor mange navn roboten faktisk fant på siden.';
  end if;

  -- Siden må vise alle navnene som blir stående. En flytting beholder navnet,
  -- så bare fjerninger trekkes fra.
  if found_count < stored_count - n_remove then
    return format(
      'Siden ga %s navn, basen har %s og %s skal fjernes -- for få til at en endring kan stoles på.',
      found_count, stored_count, n_remove);
  end if;

  if n_changes > max_removals then
    return format('Roboten kan fjerne eller flytte høyst %s navn om gangen (ba om %s).',
                  max_removals, n_changes);
  end if;
  if stored_count > 0 and n_changes::numeric / stored_count > max_removal_frac then
    return format('Roboten kan endre høyst %s %% av programmet (ba om %s av %s).',
                  (max_removal_frac * 100)::int, n_changes, stored_count);
  end if;

  -- Rørte et menneske dette programmet sist, er det fredet. Bidragsyteren kan
  -- ha vært på festivalen, eller følge artisten; en nettside vet ikke alltid
  -- mest.
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
      'Programmet for %s ble sist endret av et menneske. Roboten kan legge til, ikke fjerne eller flytte.',
      p_year);
  end if;

  -- «Sto ikke på siden» er fravær av bevis, ikke bevis. Hver endring må peke
  -- på noe som faktisk sier at den er riktig.
  for op in
    select * from jsonb_array_elements(
      coalesce(p_payload->'remove', '[]'::jsonb) || coalesce(p_payload->'move', '[]'::jsonb))
  loop
    if coalesce(trim(op->>'reason'), '') = '' then
      return format('Fjerning eller flytting av «%s» mangler begrunnelse.', op->>'name');
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.guard_robot_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Åpnet 16. november 2026. Settes den tilbake til false, er fjerning og
  -- flytting stengt igjen uten at noe annet må endres.
  robot_may_remove constant boolean := true;

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

  if n_move > 0 and not robot_may_remove then
    raise exception 'Roboten kan ikke flytte artister (flytting er fjerning med et ekstra steg).';
  end if;
  if n_remove > 0 and not robot_may_remove then
    raise exception 'Roboten kan ikke fjerne artister.';
  end if;

  -- En flytting er en fjerning med et ekstra steg: navnet forsvinner fra den
  -- ene dagen uansett hva som skjer med den andre. Den følger derfor de samme
  -- reglene, i stedet for å bli smutthullet rundt dem.
  if n_remove + n_move > 0 then
    if new.confidence is distinct from 'high' then
      raise exception 'Fjerning og flytting krever confidence «high». Tvil er ikke grunn nok til å ta noe bort.';
    end if;

    problem := public.robot_removal_problem(new.festival_id, new.edition_year, new.payload);
    if problem is not null then
      raise exception '%', problem;
    end if;
  end if;

  return new;
end;
$$;

-- Svaret skal vise «true» når dette er kjørt. Se det i resultatruta i
-- SQL Editor.
select prosrc like '%robot_may_remove constant boolean := true%' as fjerning_er_apnet
  from pg_proc
 where proname = 'guard_robot_submission';
