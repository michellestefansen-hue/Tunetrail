-- Ni nye smaa/nisje-festivaler og oppdatering av to eksisterende (Inferno, Roadburn),
-- fra brukerens research-CSV for januar-april 2027. Vurdert mot 'legg til om de ikke
-- finnes fra for eller oppdater om det er avvik' -- ingen av de ni kolliderte med noe
-- i basen (sjekket navn og slug). Bilder er bevisst utelatt: kildens 'image_or_poster'
-- kolonne peker pa festivalenes egne sider, ikke pa bildefiler.

-- ============================================================
-- Nye festivaler (9 stk)
-- ============================================================

-- Rockaway Beach
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Rockaway Beach', 'rockaway-beach', 'Storbritannia', 'Bognor Regis', 'Butlin''s Bognor Regis',
    'https://www.rockawaybeach.co.uk/',
    'An indoor alternative-music weekender at the seaside resort of Butlin''s Bognor Regis, combining emerging, breakthrough and established artists across three closely connected stages. Accommodation is bundled with the festival, giving it the feel of a self-contained winter music holiday rather than a conventional city festival.',
    'Rock & Alternativ',
    ARRAY['Alternativ & Indie','Rock','Punk & Hardcore']::text[],
    '2000_10000',
    50.787291, -0.6619159, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-01-08', '2027-01-11', 'https://bit.ly/Rockaway2027',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "The Charlatans", "stage": null, "time": null}, {"name": "Getdown Services", "stage": null, "time": null}, {"name": "SPRINTS", "stage": null, "time": null}, {"name": "The Twilight Sad", "stage": null, "time": null}, {"name": "Cockney Rejects", "stage": null, "time": null}, {"name": "Joshua Idehen", "stage": null, "time": null}, {"name": "Lucia & The Best Boys", "stage": null, "time": null}, {"name": "Madra Salach", "stage": null, "time": null}, {"name": "Sleeper", "stage": null, "time": null}, {"name": "Alien Chicks", "stage": null, "time": null}, {"name": "Bis", "stage": null, "time": null}, {"name": "City Parking", "stage": null, "time": null}, {"name": "Congratulations", "stage": null, "time": null}, {"name": "Cowboy Hunters", "stage": null, "time": null}, {"name": "Essential Logic", "stage": null, "time": null}, {"name": "Gen & The Degenerates", "stage": null, "time": null}, {"name": "Katie Malco", "stage": null, "time": null}, {"name": "Lemonsuckr", "stage": null, "time": null}, {"name": "Makeshift Art Bar", "stage": null, "time": null}, {"name": "Master Peace", "stage": null, "time": null}, {"name": "Melanie Baker", "stage": null, "time": null}, {"name": "Modern Woman", "stage": null, "time": null}, {"name": "Mouth Ulcers", "stage": null, "time": null}, {"name": "Murkage Dave", "stage": null, "time": null}, {"name": "Nightbus", "stage": null, "time": null}, {"name": "Opus Kink", "stage": null, "time": null}, {"name": "Pigeon", "stage": null, "time": null}, {"name": "Slag", "stage": null, "time": null}, {"name": "Swim Deep", "stage": null, "time": null}, {"name": "The Wran", "stage": null, "time": null}, {"name": "Tramhaus", "stage": null, "time": null}, {"name": "Vona Vella", "stage": null, "time": null}, {"name": "Chris Hawkins", "stage": null, "time": null}, {"name": "Steve Lamacq", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Orgivm Satanicvm VI
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Orgivm Satanicvm VI', 'orgivm-satanicvm', 'Norge', 'Oslo', 'Parkteatret',
    'https://www.parkteatret.no/arrangement/orgivm-satanicvm-vi',
    'A compact two-night black metal festival built around carefully hand-picked and often exclusive performances. Hosted in the intimate Parkteatret venue, the festival focuses on unusual sets, rare Norwegian appearances and artists from the darker and more adventurous corners of black metal.',
    'Metal',
    ARRAY['Metal']::text[],
    '200_2000',
    59.9228816, 10.7582637, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-01-08', '2027-01-09', 'https://www.ticketmaster.no/artist/orgivm-billetter/1013780',
  '[{"date": "2027-01-08", "day_label": null, "artists": [{"name": "Ulvesanger", "stage": null, "time": null}, {"name": "Nordjevel", "stage": null, "time": null}, {"name": "Fen", "stage": null, "time": null}, {"name": "Askeregn", "stage": null, "time": null}]}, {"date": "2027-01-09", "day_label": null, "artists": [{"name": "Dødheimsgard", "stage": null, "time": null}, {"name": "Mortem", "stage": null, "time": null}, {"name": "Avrak", "stage": null, "time": null}, {"name": "Abduction", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Northern Winter Beat
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Northern Winter Beat', 'northern-winter-beat', 'Danmark', 'Aalborg', 'Studenterhuset',
    'https://www.winterbeat.dk/en',
    'A deliberately intimate winter festival for adventurous alternative music, spread across small venues in central Aalborg. Northern Winter Beat emphasises discovery, unusual international bookings and close contact between artists and audience rather than conventional festival headliners. Spread across three venues in central Aalborg: 1000Fryd, Huset and Studenterhuset.',
    'Rock & Alternativ',
    ARRAY['Alternativ & Indie','Rock','Folk & Americana']::text[],
    '200_2000',
    57.048302, 9.919716, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-02-04', '2027-02-06', 'https://secure.tickster.com/da/aax3wd1m5d6v0dr',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "Moon Mother", "stage": null, "time": null}, {"name": "Trustfundbabes", "stage": null, "time": null}, {"name": "Full Earth", "stage": null, "time": null}, {"name": "Earth Tongue", "stage": null, "time": null}, {"name": "Caspar Brötzmann Massaker", "stage": null, "time": null}, {"name": "Why The Eye", "stage": null, "time": null}, {"name": "New Age Doom", "stage": null, "time": null}, {"name": "Nina Garcia", "stage": null, "time": null}, {"name": "Lowly", "stage": null, "time": null}, {"name": "New Age Doom & Tuvaband", "stage": null, "time": null}, {"name": "Primitive Ring", "stage": null, "time": null}, {"name": "Sara Parkman", "stage": null, "time": null}, {"name": "Yegor Zabelov", "stage": null, "time": null}, {"name": "Giles Corey", "stage": null, "time": null}, {"name": "Dope Purple", "stage": null, "time": null}, {"name": "Jim Ghedi", "stage": null, "time": null}, {"name": "Childrenn", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Grauzone Festival
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Grauzone Festival', 'grauzone-festival', 'Nederland', 'Den Haag', 'PAARD',
    'https://www.grauzonefestival.nl/',
    'A multi-venue festival dedicated to post-punk, new wave, darkwave and experimental underground culture. Grauzone combines live music with visual art, film and performance, using several intimate venues across central The Hague.',
    'Rock & Alternativ',
    ARRAY['Alternativ & Indie','Rock']::text[],
    '200_2000',
    52.0747264, 4.3076571, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-02-11', '2027-02-14', 'https://www.grauzonefestival.nl/tickets-3',
  '[{"date": "2027-02-11", "day_label": null, "artists": [{"name": "Free opening night", "stage": null, "time": null}]}, {"date": "9999-12-31", "day_label": null, "artists": [{"name": "She Past Away", "stage": null, "time": null}, {"name": "Curses (live)", "stage": null, "time": null}, {"name": "Night In Athens", "stage": null, "time": null}, {"name": "Zonbi", "stage": null, "time": null}, {"name": "Rosa Anschütz", "stage": null, "time": null}, {"name": "Mercy Girl", "stage": null, "time": null}, {"name": "Destiny Bond", "stage": null, "time": null}, {"name": "Primitive Ring", "stage": null, "time": null}, {"name": "Cold Cave (solo)", "stage": null, "time": null}, {"name": "Au Pairs", "stage": null, "time": null}, {"name": "Mothermary", "stage": null, "time": null}, {"name": "Dina Summer", "stage": null, "time": null}, {"name": "Laura Krieg", "stage": null, "time": null}, {"name": "She Can’t Afford Mascara", "stage": null, "time": null}, {"name": "Theo Vandenhoff", "stage": null, "time": null}, {"name": "The Woman", "stage": null, "time": null}, {"name": "Iceage", "stage": null, "time": null}, {"name": "Martin Dupont", "stage": null, "time": null}, {"name": "Buzz Kull", "stage": null, "time": null}, {"name": "Grenzkontrolle", "stage": null, "time": null}, {"name": "DJ Ofra", "stage": null, "time": null}, {"name": "Unhuman & Petra Flurr", "stage": null, "time": null}, {"name": "Ghost Cop", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Swiss-Alps Festival
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Swiss-Alps Festival', 'swiss-alps-festival', 'Sveits', 'Château-d''Œx', 'Temple de Château-d''Œx',
    'https://swissalpsfestival.ch/en/',
    'An intimate four-day chamber-music festival in a historic Alpine church, bringing together emerging international classical musicians in the mountain village of Château-d’Œx. The programme ranges from piano trios and quintets to sonatas and large string ensembles. Admission is free, with a voluntary collection after each concert.',
    'Klassisk',
    ARRAY['Klassisk']::text[],
    '200_2000',
    46.4738413, 7.1303012, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-02-18', '2027-02-21', null,
  '[{"date": "2027-02-18", "day_label": null, "artists": [{"name": "Opening concert", "stage": null, "time": null}]}, {"date": "2027-02-19", "day_label": null, "artists": [{"name": "Midday concert", "stage": null, "time": null}, {"name": "Evening concert", "stage": null, "time": null}]}, {"date": "2027-02-20", "day_label": null, "artists": [{"name": "Midday concert", "stage": null, "time": null}, {"name": "Evening concert", "stage": null, "time": null}]}, {"date": "2027-02-21", "day_label": null, "artists": [{"name": "Closing concert", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Transition Festival
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Transition Festival', 'transition-festival', 'Nederland', 'Utrecht', 'TivoliVredenburg',
    'https://www.tivolivredenburg.nl/agenda/72591723/transition-festival-2027-13-03-2027',
    'A one-day multi-room festival devoted to contemporary jazz: music rooted in jazz tradition but constantly moving into new territory. The entire TivoliVredenburg complex becomes the festival, allowing audiences to move between major international artists, improvisers and new projects in rooms of very different sizes.',
    'Jazz & Soul',
    ARRAY['Jazz']::text[],
    '200_2000',
    52.0924542, 5.1127685, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-03-13', '2027-03-13', 'https://www.tivolivredenburg.nl/agenda/72591723/transition-festival-2027-13-03-2027',
  '[{"date": "2027-03-13", "day_label": null, "artists": [{"name": "Cécile McLorin Salvant", "stage": null, "time": null}, {"name": "Chris Potter Trio", "stage": null, "time": null}, {"name": "Jasmine Myra", "stage": null, "time": null}, {"name": "James Brandon Lewis Trio", "stage": null, "time": null}, {"name": "Instant Composers Pool — Mishakosmos", "stage": null, "time": null}, {"name": "Sylvie Courvoisier’s Chimaera", "stage": null, "time": null}, {"name": "Mary Halvorson — Amaryllis Sextet", "stage": null, "time": null}, {"name": "Nu-Art Orchestra feat. Anna Webber", "stage": null, "time": null}, {"name": "MiXMONK", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- E-tropolis Festival
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'E-tropolis Festival', 'e-tropolis-festival', 'Tyskland', 'Oberhausen', 'Turbinenhalle',
    'https://etropolis-festival.de/en/',
    'A one-day indoor festival for EBM, industrial, dark electro and futurepop, staged inside a converted 1909 industrial turbine hall. Two live stages, a club area and the historic industrial setting make it substantially more atmospheric and compact than a conventional arena festival.',
    'Elektronisk & Dans',
    ARRAY['Elektronisk & Dans']::text[],
    '2000_10000',
    51.4835582, 6.8666494, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-03-20', '2027-03-20', 'https://www.eventim.de/en/artist/e-tropolis-festival/',
  '[{"date": "2027-03-20", "day_label": null, "artists": [{"name": "[:SITD:]", "stage": null, "time": null}, {"name": "[X]-RX", "stage": null, "time": null}, {"name": "Covenant", "stage": null, "time": null}, {"name": "Dina Summer", "stage": null, "time": null}, {"name": "Diorama", "stage": null, "time": null}, {"name": "Fractiles", "stage": null, "time": null}, {"name": "Front Line Assembly", "stage": null, "time": null}, {"name": "Future Lied To Us", "stage": null, "time": null}, {"name": "Klangstabil", "stage": null, "time": null}, {"name": "Phosgore", "stage": null, "time": null}, {"name": "Potochkine", "stage": null, "time": null}, {"name": "Solitary Experiments", "stage": null, "time": null}, {"name": "Xotox", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Samhain Festival
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Samhain Festival', 'samhain-festival', 'Belgia', 'Antwerpen', 'Trix',
    'https://www.trixonline.be/en/program/festival/samhain-festival-2027/2129/',
    'A two-day underground metal festival taking over every stage at Trix. Samhain focuses on international death, black, post and doom metal, creating a dense club-festival experience where a relatively small venue complex hosts an unusually ambitious international bill.',
    'Metal',
    ARRAY['Metal']::text[],
    '200_2000',
    51.2195776, 4.4483726, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-04-03', '2027-04-04', 'https://www.trixonline.be/en/program/festival/samhain-festival-2027/2129/',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "Fluisteraars", "stage": null, "time": null}, {"name": "Ultha", "stage": null, "time": null}, {"name": "Spirit Possession", "stage": null, "time": null}, {"name": "Miserere Luminis", "stage": null, "time": null}, {"name": "Conifère", "stage": null, "time": null}, {"name": "Vespéral", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;

-- Epic Fest
with new_festival as (
  insert into festivals (name, slug, country, city, venue_name, website_url, description, category, tags, size_band, latitude, longitude, source)
  values (
    'Epic Fest', 'epic-fest', 'Danmark', 'Roskilde', 'Roskilde Kongres- & Idrætscenter',
    'https://www.roskildekongrescenter.dk/arrangementer/epic-fest',
    'A compact two-day power- and fantasy-metal festival spread across a large main hall and smaller nearby club spaces. Epic Fest combines international melodic-metal names, special album sets and smaller genre acts in a deliberately theatrical, fan-oriented setting.',
    'Metal',
    ARRAY['Metal']::text[],
    '200_2000',
    55.635763, 12.069118, 'manual'
  )
  returning id
)
insert into festival_editions (festival_id, year, date_from, date_to, ticket_url, program, source)
select id, 2027,
  '2027-04-09', '2027-04-10', 'https://www.roskildekongrescenter.dk/arrangementer/epic-fest',
  '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "HammerFall", "stage": null, "time": null}, {"name": "Korpiklaani", "stage": null, "time": null}, {"name": "Warkings", "stage": null, "time": null}, {"name": "Edu Falaschi", "stage": null, "time": null}, {"name": "Elvenking", "stage": null, "time": null}, {"name": "Nanowar of Steel", "stage": null, "time": null}, {"name": "Freedom Call", "stage": null, "time": null}, {"name": "Heavysaurus", "stage": null, "time": null}, {"name": "Temperance", "stage": null, "time": null}, {"name": "Labyrinth", "stage": null, "time": null}, {"name": "Hagane", "stage": null, "time": null}, {"name": "Masters Of Ceremony", "stage": null, "time": null}, {"name": "Dreamtale", "stage": null, "time": null}, {"name": "Hulkoff", "stage": null, "time": null}, {"name": "Jupiter", "stage": null, "time": null}, {"name": "Sellsword", "stage": null, "time": null}, {"name": "Tower Hill", "stage": null, "time": null}, {"name": "Owlbear", "stage": null, "time": null}, {"name": "Power Paladin", "stage": null, "time": null}, {"name": "Heimdall", "stage": null, "time": null}, {"name": "Skeleton", "stage": null, "time": null}, {"name": "The 7th Guild", "stage": null, "time": null}]}]'::jsonb, 'manual'
from new_festival;
-- ============================================================
-- Oppdatering av 2 eksisterende festivaler
-- ============================================================

-- Inferno hadde ingen kategori satt (null). Rendyrket ekstremmetall -- entydig.
update festivals set category = 'Metal', size_band = '2000_10000'
 where slug = 'inferno-metal-festival';

-- Roadburn sto som 'Blandet/Flersjanger' -- den generiske sekkeposten som
-- ogsaa fanget Copenhell og Brutal Assault tidligere i prosjektet. Roadburn
-- beskriver seg selv som "a genre-fluid boutique festival for heavy and
-- experimental music", og tags-feltet (Rock, Metal, Punk & Hardcore,
-- Alternativ & Indie) viser bredden -- men tyngdepunktet er entydig hardt og
-- metalnaert. Metal er riktigere enn sekkeposten.
update festivals set category = 'Metal', size_band = '2000_10000'
 where slug = 'roadburn-festival';

-- Inferno Metal Festival 2027: 10 nye artistnavn flettet inn i de 10 som
-- allerede lå der (robotens forrige runde). Ingen duplikater -- sjekket mot
-- normalisert navn, ikke ren tekstlikhet, sa aksentforskjeller ikke gir dobbeltoppforinger.
-- ticket_url uendret: den som alt ligger der (infernofestival.no/tickets) er festivalens
-- egen side, penere enn Ticketmaster-lenken i kilden.
update festival_editions e
   set program = '[{"date": "9999-12-31", "day_label": null, "artists": [{"name": "Kampfar", "stage": null, "time": null}, {"name": "Mgła", "stage": null, "time": null}, {"name": "Trelldom", "stage": null, "time": null}, {"name": "Ellende", "stage": null, "time": null}, {"name": "Kraanium", "stage": null, "time": null}, {"name": "Hellripper", "stage": null, "time": null}, {"name": "Ruïm", "stage": null, "time": null}, {"name": "KVAEN", "stage": null, "time": null}, {"name": "Jordsjuk", "stage": null, "time": null}, {"name": "Bianca", "stage": null, "time": null}, {"name": "Master’s Hammer", "stage": null, "time": null}, {"name": "Towards The Sinister", "stage": null, "time": null}, {"name": "Green Carnation", "stage": null, "time": null}, {"name": "The Ruins of Beverast", "stage": null, "time": null}, {"name": "Sarkom", "stage": null, "time": null}, {"name": "Houle", "stage": null, "time": null}, {"name": "Shores of Null", "stage": null, "time": null}, {"name": "Lifesick", "stage": null, "time": null}, {"name": "Krapyl", "stage": null, "time": null}, {"name": "Blodmaane", "stage": null, "time": null}]}]'::jsonb
  from festivals f
 where f.id = e.festival_id and f.slug = 'inferno-metal-festival' and e.year = 2027;

-- Roadburn Festival 2027: de 4 artistene som lå under 'dag ikke bestemt' far na
-- faktiske dager. Neurosis spiller bade fredag og lordag med ulikt sett -- det er en
-- ekte booking pa to dager, ikke en feil, og programmodellen stotter det direkte.
-- Sondagens rad i kilden hadde ingen navngitt artist og er derfor ikke tatt med.
-- ticket_url uendret: den eksisterende (tickets.roadburn.com) er en direkte
-- billettlenke, kildens er en nyhetsside om nar billetter slippes.
update festival_editions e
   set program = '[{"date": "2027-04-15", "day_label": null, "artists": [{"name": "Emma Ruth Rundle", "stage": null, "time": null}, {"name": "Sadness", "stage": null, "time": null}]}, {"date": "2027-04-16", "day_label": null, "artists": [{"name": "Neurosis", "stage": null, "time": null}, {"name": "Trhä", "stage": null, "time": null}]}, {"date": "2027-04-17", "day_label": null, "artists": [{"name": "Neurosis", "stage": null, "time": null}]}]'::jsonb
  from festivals f
 where f.id = e.festival_id and f.slug = 'roadburn-festival' and e.year = 2027;

-- ============================================================
-- Hold artistregisteret i takt, sa de nye navnene er sokbare
-- ============================================================
insert into artist_names (name, name_key, uses)
select distinct a->>'name', lower(unaccent(a->>'name')), 1
  from festival_editions e
  join festivals f on f.id = e.festival_id,
       jsonb_array_elements(e.program) day,
       jsonb_array_elements(day->'artists') a
 where f.slug in ('rockaway-beach','orgivm-satanicvm','northern-winter-beat',
                  'grauzone-festival','swiss-alps-festival','transition-festival',
                  'e-tropolis-festival','samhain-festival','epic-fest',
                  'inferno-metal-festival','roadburn-festival')
   and e.year = 2027
   and coalesce(trim(a->>'name'), '') <> ''
on conflict (name) do nothing;

-- ============================================================
-- Kontroll: forventet 11 rader, en per festival, med riktig antall artister
-- ============================================================
select f.name, e.year, e.date_from, e.date_to,
       (select count(*) from jsonb_array_elements(e.program) d,
               jsonb_array_elements(d->'artists') a) as antall_artister
  from festival_editions e join festivals f on f.id = e.festival_id
 where f.slug in ('rockaway-beach','orgivm-satanicvm','northern-winter-beat',
                  'grauzone-festival','swiss-alps-festival','transition-festival',
                  'e-tropolis-festival','samhain-festival','epic-fest',
                  'inferno-metal-festival','roadburn-festival')
   and e.year = 2027
 order by f.name;