-- Clam Rock kunne ikke godkjennes.
--
-- Roboten foreslo festivalen 17. november 2026 med hovedsjangeren
-- «Rock & Metal». Den finnes ikke lenger: lista ble endret da Tunetrail ble
-- europeisk, og godkjenningen stoppet med «violates check constraint
-- festivals_category_check». Roboten sjekket mot den gamle lista; det er rettet
-- i 20261119_robot_category_list.sql.
--
-- Denne fila retter forslaget som ligger i køen: hovedsjangeren blir
-- «Rock & Alternativ», og beskrivelsen skrives på engelsk. Den rører bare
-- Clam Rock, og stopper uten å endre noe hvis den ikke finner nøyaktig ett
-- ventende forslag.

do $$
declare n int;
begin
  update public.submissions
     set payload = jsonb_set(
                     jsonb_set(payload, '{category}', '"Rock & Alternativ"'),
                     '{description}',
                     to_jsonb('One-day classic rock and blues rock festival below Burg Clam castle in Upper Austria, organised by Clam Live. The 2027 edition is headlined by Lynyrd Skynyrd and 10cc.'::text)),
         note = replace(note, '«Rock & Metal»', '«Rock & Alternativ»')
   where kind = 'festival_new'
     and status = 'pending'
     and payload->>'name' = 'Clam Rock'
     and payload->>'category' = 'Rock & Metal';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Fant % ventende Clam Rock-forslag med «Rock & Metal», ventet nøyaktig 1. Ingenting er endret.', n;
  end if;
end;
$$;

-- Svaret skal vise én rad: Rock & Alternativ, og den engelske beskrivelsen.
select payload->>'name'        as festival,
       payload->>'category'    as hovedsjanger,
       payload->>'description' as beskrivelse
  from public.submissions
 where kind = 'festival_new' and status = 'pending' and payload->>'name' = 'Clam Rock';
