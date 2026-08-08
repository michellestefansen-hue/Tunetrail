-- Retter skaden den nattlige Ticketmaster-jobben gjorde.
--
-- Jobben skrev rett til databasen uten godkjenning. Der Ticketmaster bare fant
-- ett enkeltarrangement, ble flerdagersfestivaler kollapset til én dag -- og i
-- ett tilfelle ble en helt annen konsertserie limt inn som lineup.
--
-- Alle datoene under er hentet fra festivalenes egne nettsteder 8. august 2026,
-- ikke fra Ticketmaster. source settes til 'manual' fordi de nå er
-- håndverifiserte.
--
-- Jobben er avslått i samme slengen, så dette skal ikke kunne skje igjen.


-- ---------------------------------------------------------------------------
-- 1. Rettinger: riktige datoer finnes, utgaven beholdes
-- ---------------------------------------------------------------------------

-- Pori Jazz: kollapset til 17.7. Hovedkonsertene 2027 er 15.-17. juli.
-- Kilde: porijazz.fi
update public.festival_editions e
   set date_from = '2027-07-15', date_to = '2027-07-17', source = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'pori-jazz' and e.year = 2027;

-- Parklife: kollapset til 10.7. Faktisk 10.-11. juli 2027 (flyttet fra juni).
-- Kilde: parklife.uk.com
update public.festival_editions e
   set date_from = '2027-07-10', date_to = '2027-07-11', source = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'parklife-festival' and e.year = 2027;

-- Ilosaarirock: kollapset til 16.7. Riktig start, feil slutt. 16.-18. juli.
-- Kilde: ilosaarirock.fi
update public.festival_editions e
   set date_from = '2027-07-16', date_to = '2027-07-18', source = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'ilosaarirock' and e.year = 2027;

-- Download: 9. juni var riktig start, men slutten ble satt til 11. Festivalen
-- går onsdag 9. til søndag 13. juni 2027.
-- Kilde: downloadfestival.co.uk
update public.festival_editions e
   set date_from = '2027-06-09', date_to = '2027-06-13', source = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'download-festival' and e.year = 2027;

-- Latitude: den eneste av dem som fantes fra før. Jeg satte 22.-25. juli i
-- editions_2027_batch1.sql, Ticketmaster overskrev med 21.-22. Nettstedet
-- bekrefter at den opprinnelige verdien var riktig.
-- Kilde: latitudefestival.com
update public.festival_editions e
   set date_from = '2027-07-22', date_to = '2027-07-25', source = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'latitude-festival' and e.year = 2027;


-- ---------------------------------------------------------------------------
-- 2. Edinburgh 2026: feil datoer OG feil lineup
-- ---------------------------------------------------------------------------
--
-- Sto som «8. august – 7. november», en festival på tre måneder. De 41
-- artistene tilhører Edinburgh Summer Sessions, en egen konsertserie i Princes
-- Street Gardens -- pluss tre løsrevne enkeltkonserter i september, oktober og
-- november. Festivalen i basen peker på eif.co.uk, altså Edinburgh
-- International Festival, som er en klassisk- og teaterfestival.
--
-- Verken datoene eller lineupen hører til. Datoene rettes til de faktiske
-- (7.-30. august 2026, kilde eif.co.uk) og programmet tømmes.
--
-- MERK: dette fjerner 41 artistoppføringer. De er ekte artister, men de spiller
-- på feil festival. Vil du beholde dem, hopp over denne ene setningen -- da må
-- de i så fall flyttes til en egen «Edinburgh Summer Sessions»-festival.
update public.festival_editions e
   set date_from = '2026-08-07',
       date_to   = '2026-08-30',
       program   = '[]'::jsonb,
       source    = 'manual'
  from public.festivals f
 where f.id = e.festival_id and f.slug = 'edinburgh-festival' and e.year = 2026;


-- ---------------------------------------------------------------------------
-- 3. Slettinger: utgaver Ticketmaster fant på, uten grunnlag
-- ---------------------------------------------------------------------------
--
-- Disse tre fantes ikke før jobben laget dem. Ingen av festivalene har
-- offentliggjort 2027-datoer, så det som står er en enkeltdag Ticketmaster
-- gjettet seg til. En tom utgave med feil dato er verre enn ingen utgave: den
-- blir festivalens hoveddato på siden.
--
-- 2026-utgavene røres ikke. Kommer 2027-datoene, legges de inn på nytt.

-- Edinburgh Festival 2027: sto til 16. februar. Festivalen er i august.
delete from public.festival_editions e
 using public.festivals f
 where f.id = e.festival_id and f.slug = 'edinburgh-festival' and e.year = 2027;

-- Bestival 2027: enkeltdag 29. juli, ingen datoer offentliggjort.
delete from public.festival_editions e
 using public.festivals f
 where f.id = e.festival_id and f.slug = 'bestival' and e.year = 2027;

-- Canal Street 2027: enkeltdag 30. juli, ingen datoer offentliggjort.
delete from public.festival_editions e
 using public.festivals f
 where f.id = e.festival_id and f.slug = 'canal-street' and e.year = 2027;


-- ---------------------------------------------------------------------------
-- 4. Kontroll: skal returnere null rader når alt er kjørt
-- ---------------------------------------------------------------------------
select f.name, e.year, e.date_from, e.date_to, e.source
  from public.festival_editions e
  join public.festivals f on f.id = e.festival_id
 where e.source = 'ticketmaster'
   and f.slug in ('edinburgh-festival','pori-jazz','parklife-festival','bestival',
                  'ilosaarirock','canal-street','latitude-festival','download-festival');
