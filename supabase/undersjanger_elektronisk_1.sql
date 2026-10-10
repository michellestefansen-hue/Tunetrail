-- Undersjanger for elektroniske festivaler, runde 1.
-- Satt 2026-10-10. Krever 20261010_festival_subgenres.sql.
--
-- 71 av 83 festivaler i elektronikasettet. De 15 som
-- gjenstaar er smaa eller uklare og tas i en egen runde -- kolonnen er
-- nullbar, saa de staar riktig som tomme inntil da.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Tomorrowland: edm, house, trance, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','house','trance','hardstyle'] where slug = 'tomorrowland';

-- Defqon.1 Festival: hardstyle  (kjent profil)
update festivals set subgenres = array['hardstyle'] where slug = 'defqon-1-festival';

-- Decibel Outdoor: hardstyle  (kjent profil)
update festivals set subgenres = array['hardstyle'] where slug = 'decibel-outdoor';

-- Dominator Festival: hardstyle  (kjent profil)
update festivals set subgenres = array['hardstyle'] where slug = 'dominator-festival';

-- Reverze: hardstyle  (kjent profil)
update festivals set subgenres = array['hardstyle'] where slug = 'reverze';

-- Parookaville: edm, hardstyle, house  (kjent profil)
update festivals set subgenres = array['edm','hardstyle','house'] where slug = 'parookaville';

-- Mysteryland: edm, house, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','house','hardstyle'] where slug = 'mysteryland';

-- Ultra Europe: edm, house, trance  (kjent profil)
update festivals set subgenres = array['edm','house','trance'] where slug = 'ultra-europe';

-- Untold Festival: edm, house, trance  (kjent profil)
update festivals set subgenres = array['edm','house','trance'] where slug = 'untold-festival';

-- Medusa Festival: edm, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','hardstyle'] where slug = 'medusa-festival';

-- Electric Love Festival: edm, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','hardstyle'] where slug = 'electric-love-festival';

-- BigCityBeats World Club Dome: edm  (kjent profil)
update festivals set subgenres = array['edm'] where slug = 'bigcitybeats-world-club-dome';

-- Airbeat One: edm, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','hardstyle'] where slug = 'airbeat-one';

-- SonneMondSterne: edm, techno, house  (kjent profil)
update festivals set subgenres = array['edm','techno','house'] where slug = 'sonnemondsterne';

-- Nameless Festival: edm  (kjent profil)
update festivals set subgenres = array['edm'] where slug = 'nameless-festival';

-- Sea You Festival: edm, house  (kjent profil)
update festivals set subgenres = array['edm','house'] where slug = 'sea-you-festival';

-- Ikarus Festival: edm, techno, house  (kjent profil)
update festivals set subgenres = array['edm','techno','house'] where slug = 'ikarus-festival';

-- Dance Valley: edm, house, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','house','hardstyle'] where slug = 'dance-valley';

-- Delta Festival: edm, house  (kjent profil)
update festivals set subgenres = array['edm','house'] where slug = 'delta-festival';

-- Les Plages Électroniques: edm, house, techno  (kjent profil)
update festivals set subgenres = array['edm','house','techno'] where slug = 'les-plages-electroniques';

-- Elektric Park Festival: edm, house  (kjent profil)
update festivals set subgenres = array['edm','house'] where slug = 'elektric-park-festival';

-- Lovefest: edm, house  (kjent profil)
update festivals set subgenres = array['edm','house'] where slug = 'lovefest';

-- B.my.Lake: edm, house  (kjent profil)
update festivals set subgenres = array['edm','house'] where slug = 'b-my-lake';

-- Extrema Outdoor Belgium: techno, house, edm  (kjent profil)
update festivals set subgenres = array['techno','house','edm'] where slug = 'extrema-outdoor-belgium';

-- Dreambeach: edm, techno, hardstyle  (nettsoek)
update festivals set subgenres = array['edm','techno','hardstyle'] where slug = 'dreambeach';

-- Nibirii Festival: techno, psytrance, dnb, hardstyle  (nettsoek)
update festivals set subgenres = array['techno','psytrance','dnb','hardstyle'] where slug = 'nibirii-festival';

-- Awakenings Festival: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'awakenings-festival';

-- Awakenings Upclose: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'awakenings-upclose';

-- Time Warp Germany: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'time-warp-germany';

-- Dekmantel Festival: techno, house, ambient  (kjent profil)
update festivals set subgenres = array['techno','house','ambient'] where slug = 'dekmantel-festival';

-- Kappa FuturFestival: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'kappa-futurfestival';

-- Nuits Sonores: techno, house, ambient  (kjent profil)
update festivals set subgenres = array['techno','house','ambient'] where slug = 'nuits-sonores';

-- DGTL Festival Amsterdam: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'dgtl-festival-amsterdam';

-- Draaimolen Festival: techno, ambient  (kjent profil)
update festivals set subgenres = array['techno','ambient'] where slug = 'draaimolen-festival';

-- Dimensions Festival: techno, house, dnb  (kjent profil)
update festivals set subgenres = array['techno','house','dnb'] where slug = 'dimensions-festival';

-- Terminal V Croatia: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'terminal-v-croatia';

-- Stone Techno Festival: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'stone-techno-festival';

-- Monegros Desert Festival: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'monegros-desert-festival';

-- Verknipt Festival: techno, hardstyle  (kjent profil)
update festivals set subgenres = array['techno','hardstyle'] where slug = 'verknipt-festival';

-- Verknipt Croatia: techno, hardstyle  (kjent profil)
update festivals set subgenres = array['techno','hardstyle'] where slug = 'verknipt-croatia';

-- Nation of Gondwana: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'nation-of-gondwana';

-- Houghton Festival: techno, house, ambient  (kjent profil)
update festivals set subgenres = array['techno','house','ambient'] where slug = 'houghton-festival';

-- Gottwood Festival: house, techno  (kjent profil)
update festivals set subgenres = array['house','techno'] where slug = 'gottwood-festival';

-- Glitch Festival: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'glitch-festival';

-- Caprices festival: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'caprices-festival';

-- Horst Music Festival: techno, house, ambient  (kjent profil)
update festivals set subgenres = array['techno','house','ambient'] where slug = 'horst-music-festival';

-- Festival Le Bon Air: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'festival-le-bon-air';

-- Decibel Open Air: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'decibel-open-air';

-- NEOPOP Festival: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'neopop';

-- Karrusel: house, techno  (kjent profil)
update festivals set subgenres = array['house','techno'] where slug = 'karrusel';

-- Love Family Park: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'love-family-park';

-- Love Parade: techno  (kjent profil)
update festivals set subgenres = array['techno'] where slug = 'love-parade';

-- Mystic Garden Festival: house, techno  (kjent profil)
update festivals set subgenres = array['house','techno'] where slug = 'mystic-garden-festival';

-- Barrakud Croatia: house, techno  (kjent profil)
update festivals set subgenres = array['house','techno'] where slug = 'barrakud-croatia';

-- Junction 2 Festival: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'junction-2-festival';

-- Field Day: techno, house  (kjent profil)
update festivals set subgenres = array['techno','house'] where slug = 'field-day';

-- SunIce Festival St. Moritz: house, techno  (kjent profil)
update festivals set subgenres = array['house','techno'] where slug = 'sunice-festival-st-moritz';

-- Amsterdam Dance Event: techno, house, edm  (kjent profil)
update festivals set subgenres = array['techno','house','edm'] where slug = 'amsterdam-dance-event';

-- Sónar Barcelona: techno, house, ambient  (kjent profil)
update festivals set subgenres = array['techno','house','ambient'] where slug = 'sonar-barcelona';

-- Parklife Festival: house, dnb  (kjent profil)
update festivals set subgenres = array['house','dnb'] where slug = 'parklife-festival';

-- Hideout Festival: house, dnb, techno  (nettsoek)
update festivals set subgenres = array['house','dnb','techno'] where slug = 'hideout-festival';

-- Let It Roll: dnb  (nettsoek)
update festivals set subgenres = array['dnb'] where slug = 'let-it-roll';

-- Mo:Dem Festival: psytrance, techno, ambient  (nettsoek)
update festivals set subgenres = array['psytrance','techno','ambient'] where slug = 'mo-dem-festival';

-- Chronosphere Festival: house, techno, ambient  (nettsoek)
update festivals set subgenres = array['house','techno','ambient'] where slug = 'chronosphere-festival';

-- Winterwaves: goth_industrial  (kjent profil)
update festivals set subgenres = array['goth_industrial'] where slug = 'winterwaves';

-- E-tropolis Festival: goth_industrial  (kjent profil)
update festivals set subgenres = array['goth_industrial'] where slug = 'e-tropolis-festival';

-- Pitchfork Music Festival London: indie_alt  (kjent profil)
update festivals set subgenres = array['indie_alt'] where slug = 'pitchfork-music-festival-london';

-- Waves Vienna: indie_alt  (kjent profil)
update festivals set subgenres = array['indie_alt'] where slug = 'waves-vienna';

-- Creamfields: edm, house, trance, hardstyle  (kjent profil)
update festivals set subgenres = array['edm','house','trance','hardstyle'] where slug = 'creamfields';

-- Nature One: techno, hardstyle, edm  (kjent profil)
update festivals set subgenres = array['techno','hardstyle','edm'] where slug = 'nature-one';

-- Meakusma Festival: ambient  (kjent profil)
update festivals set subgenres = array['ambient'] where slug = 'meakusma-festival';

commit;

select name, subgenres from festivals
 where subgenres is not null order by name;
