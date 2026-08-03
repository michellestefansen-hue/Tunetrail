-- Publikumstall hentet av ChatGPT med nettsok, kontrollert mot bandene
-- for hver rad. To grensetilfeller rettet (100 000 -> over_100000, ikke
-- 50000_100000, etter regelen 'inkluderende nedad'). 145 av 692 festivaler
-- hadde ikke et paliteig tall a bygge pa og star fortsatt uten size_band.

update public.festivals set size_band = 'over_100000' where name = 'Sunny Hill Festival';  -- 100 000+ (2025), newsroom.feverup.com
update public.festivals set size_band = '50000_100000' where name = 'Alcatraz Metal Festival';  -- 60 000 (2025), focus-wtv.be
update public.festivals set size_band = '2000_10000' where name = 'Bezemrock';  -- 2 500+ (2017), vi.be
update public.festivals set size_band = '2000_10000' where name = 'Boerenrock';  -- 6 000 (2023), vrt.be
update public.festivals set size_band = '50000_100000' where name = 'Couleur Café';  -- 75 000 (2025), couleurcafe.be
update public.festivals set size_band = '10000_50000' where name = 'Crammerock';  -- 37 000 (2025), nieuwsblad.be
update public.festivals set size_band = 'over_100000' where name = 'Dour Festival';  -- 221 920 (2024), brusselstimes.com
update public.festivals set size_band = '10000_50000' where name = 'Esperanzah!';  -- 36 000 (2022), brusselstimes.com
update public.festivals set size_band = '50000_100000' where name = 'Extrema Outdoor Belgium';  -- 70 000+ (2026), undergroundsound.eu
update public.festivals set size_band = '50000_100000' where name = 'Flanders Festival Ghent';  -- 50 000 (2025), theguardian.com
update public.festivals set size_band = '50000_100000' where name = 'Gent Jazz Festival';  -- 57 000 (2024), iqmagazine.com
update public.festivals set size_band = 'over_100000' where name = 'Graspop Metal Meeting';  -- 220 000 (2025), graspop.be (55 000 per dag × 4)
update public.festivals set size_band = '10000_50000' where name = 'Jazz Middelheim';  -- 11 000 (2025), jazzjournal.co.uk
update public.festivals set size_band = '10000_50000' where name = 'Leffingeleuren';  -- 10 000 (2025), vrt.be
update public.festivals set size_band = 'over_100000' where name = 'Les Ardentes';  -- 245 000 (2025), qu4tre.be
update public.festivals set size_band = 'over_100000' where name = 'Les Francofolies de Spa';  -- 100 000 (2026), archive.ph
update public.festivals set size_band = 'over_100000' where name = 'Lokerse Feesten';  -- 131 000 (2025), waaskrant.be
update public.festivals set size_band = 'over_100000' where name = 'Pukkelpop';  -- 264 000+ (2025), belganewsagency.eu (66 000 per dag × 4)
update public.festivals set size_band = '10000_50000' where name = 'Reverze';  -- 30 000 (2026), linkedin.com (Bass Events)
update public.festivals set size_band = 'over_100000' where name = 'Rock Werchter';  -- 352 000 (2025), pollstar.com (88 000 per dag × 4)
update public.festivals set size_band = '10000_50000' where name = 'Rock Zottegem';  -- 36 000 (2025), tvoost.be
update public.festivals set size_band = 'over_100000' where name = 'Suikerrock';  -- 100 000+ (2025), stagr.de
update public.festivals set size_band = '50000_100000' where name = 'TW Classic';  -- 60 000 (2025), wikipedia.org (kapasitet)
update public.festivals set size_band = 'over_100000' where name = 'Tomorrowland';  -- 400 000+ (2025), tomorrowland.com (flere helger)
update public.festivals set size_band = '50000_100000' where name = 'Werchter Boutique';  -- 60 000 (2025), wikipedia.org (kapasitet)
update public.festivals set size_band = 'over_100000' where name = 'Copenhagen Jazz Festival';  -- 250 000+ (2025), visitcopenhagen.com
update public.festivals set size_band = '10000_50000' where name = 'Copenhagen Opera Festival';  -- 31 000 (2025), iscene.dk
update public.festivals set size_band = 'over_100000' where name = 'Copenhell';  -- 140 000 (2025), myglobalmind.com (35 000 per dag × 4)
update public.festivals set size_band = 'over_100000' where name = 'NorthSide Festival';  -- 105 000 (2025), yourope.org (kapasitet 35 000 per dag × 3)
update public.festivals set size_band = '10000_50000' where name = 'Rock under Broen';  -- 38 000 (2025), rockunderbroen.dk
update public.festivals set size_band = 'over_100000' where name = 'Roskilde Festival';  -- 130 000+ (2025), roskilde-festival.dk
update public.festivals set size_band = '50000_100000' where name = 'Smukfest';  -- 60 000 (2025), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Tinderbox Festival';  -- 150 000 (2025), via.ritzau.dk (opptil 50 000 per dag × 3)
update public.festivals set size_band = '10000_50000' where name = 'Tønder Festival';  -- 15 000 (2025), tf.dk
update public.festivals set size_band = '10000_50000' where name = 'Vilde Vulkaner Festival';  -- 11 200 (2025), vordingborg.in
update public.festivals set size_band = '2000_10000' where name = 'Wonderfestiwall';  -- 7 500 (2025), wonderfestiwall.dk
update public.festivals set size_band = '10000_50000' where name = 'Jazzkaar';  -- 19 300+ (2025), jazzkaar.ee
update public.festivals set size_band = '10000_50000' where name = 'Viljandi Folk Music Festival';  -- 38 000 (2025), viljandifolk.ee
update public.festivals set size_band = '50000_100000' where name = 'Flow Festival';  -- 92 000 (2025), flowfestival.com
update public.festivals set size_band = '50000_100000' where name = 'Ilosaarirock';  -- 64 000+ (2026), yle.fi
update public.festivals set size_band = '50000_100000' where name = 'Kaustinen Folk Music Festival';  -- 60 000 (2026), yle.fi (nesten 60 000)
update public.festivals set size_band = '10000_50000' where name = 'Nummirock';  -- 18 000 (2026), grimmgent.com
update public.festivals set size_band = 'over_100000' where name = 'Pori Jazz';  -- 192 000 (2025), mesta.net
update public.festivals set size_band = '50000_100000' where name = 'Provinssi';  -- 70 000 (2025), provinssi.fi
update public.festivals set size_band = '10000_50000' where name = 'Qstock';  -- 40 000 (2026), qstock.fi
update public.festivals set size_band = '50000_100000' where name = 'Ruisrock';  -- 85 000 (2026), aamuset.fi
update public.festivals set size_band = '50000_100000' where name = 'Tuska Open Air Metal Festival';  -- 66 000 (2026), tuska.fi
update public.festivals set size_band = 'over_100000' where name = 'Delta Festival';  -- 150 000 (2025), departement13.fr (forventet/kapasitet)
update public.festivals set size_band = 'over_100000' where name = 'Eurockéennes de Belfort';  -- 125 000 (2026), macommune.info
update public.festivals set size_band = 'over_100000' where name = 'Festival Beauregard';  -- 160 000 (2026), wrnc.eu
update public.festivals set size_band = 'over_100000' where name = 'Festival Interceltique de Lorient';  -- 950 000+ (2025), festival-interceltique.bzh
update public.festivals set size_band = 'over_100000' where name = 'Garorock Festival';  -- 120 000 (2025), culture.newstank.fr
update public.festivals set size_band = 'over_100000' where name = 'Hellfest';  -- 240 000 (2026), rstlss.com
update public.festivals set size_band = 'over_100000' where name = 'Jazz in Marciac';  -- 300 000+ (2025), taittinger.fr
update public.festivals set size_band = 'over_100000' where name = 'Jazz à Vienne';  -- 210 000 (2026), instagram.com (Jazz à Vienne)
update public.festivals set size_band = 'over_100000' where name = 'Le Cabaret Vert';  -- 101 000 (2025), cabaretvert.com
update public.festivals set size_band = 'over_100000' where name = 'Les Eurockéennes';  -- 125 000 (2026), macommune.info (samme festival som Eurockéennes de Belfort)
update public.festivals set size_band = '50000_100000' where name = 'Les Plages Électroniques';  -- 66 000 (2025), culture.newstank.fr
update public.festivals set size_band = 'over_100000' where name = 'Lollapalooza Paris';  -- 160 000 (2025), culture.newstank.fr
update public.festivals set size_band = 'over_100000' where name = 'Main Square Festival';  -- 120 000+ (2026), facebook.com (La Voix du Nord)
update public.festivals set size_band = '50000_100000' where name = 'Motocultor Festival';  -- 62 500 (2025), culture.newstank.fr
update public.festivals set size_band = '10000_50000' where name = 'Musicalarue';  -- 45 000 (2025), lemonde.fr
update public.festivals set size_band = 'over_100000' where name = 'Musilac';  -- 110 000+ (2026), odsradio.com
update public.festivals set size_band = '50000_100000' where name = 'Nuits Sonores';  -- 98 000 (2026), instagram.com (Nuits sonores)
update public.festivals set size_band = '50000_100000' where name = 'Papillons de nuit';  -- 99 000 (2026), papillonsdenuit.com
update public.festivals set size_band = 'over_100000' where name = 'Printemps de Bourges';  -- 250 000+ (2026), printemps-bourges.com
update public.festivals set size_band = 'over_100000' where name = 'Rock en Seine';  -- 150 000 (2025), culture.newstank.fr
update public.festivals set size_band = 'over_100000' where name = 'Solidays';  -- 258 800 (2025), leparisien.fr
update public.festivals set size_band = 'over_100000' where name = 'Vieilles Charrues Festival';  -- 280 000 (2026), youtube.com
update public.festivals set size_band = 'over_100000' where name = 'We Love Green';  -- 110 000 (2026), welovegreen.fr (38 000 + 39 000 + 33 000)
update public.festivals set size_band = '50000_100000' where name = 'Slane Concert';  -- 80 000 (2023), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Kappa FuturFestival';  -- 125 000+ (2026), keyimagazine.com
update public.festivals set size_band = 'over_100000' where name = 'La Notte della Taranta – Concertone';  -- 160 000 (2025), corriere.it
update public.festivals set size_band = '50000_100000' where name = 'Nameless Festival';  -- 90 000+ (2025), edm-lab.com
update public.festivals set size_band = 'over_100000' where name = 'Red Valley Festival';  -- 118 000+ (2025), happy.rentals
update public.festivals set size_band = '10000_50000' where name = 'Rossini Opera Festival';  -- 15 559 (2025), rossinioperafestival.it
update public.festivals set size_band = '10000_50000' where name = 'Umbria Jazz Winter';  -- 12 000 (2025), umbriajazz.it
update public.festivals set size_band = 'over_100000' where name = 'INmusic Festival';  -- 100 000 (2022), wikipedia.org
update public.festivals set size_band = '10000_50000' where name = 'Sea Star Festival';  -- 44 000 (2025), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Ultra Europe';  -- 140 000+ (2026), edmli.com
update public.festivals set size_band = 'over_100000' where name = 'Špancirfest';  -- 290 000 (2025), spancirfest.com
update public.festivals set size_band = 'over_100000' where name = 'Amsterdam Dance Event';  -- 600 000 (2025), amsterdam-dance-event.nl
update public.festivals set size_band = 'over_100000' where name = 'Defqon.1 Festival';  -- 250 000 (2025), omni.se
update public.festivals set size_band = '10000_50000' where name = 'Down The Rabbit Hole';  -- 47 000 (2024), wikipedia.org
update public.festivals set size_band = '50000_100000' where name = 'Lowlands';  -- 65 000 (2025), iqmagazine.com
update public.festivals set size_band = 'over_100000' where name = 'Mysteryland';  -- 125 000+ (2025), mysteryland.nl
update public.festivals set size_band = '50000_100000' where name = 'North Sea Jazz';  -- 90 000 (2026), thetimes.com
update public.festivals set size_band = 'over_100000' where name = 'Pinkpop Festival';  -- 130 000 (2025), festileaks.com (40 000 + 40 000 + 50 000)
update public.festivals set size_band = 'over_100000' where name = 'Zwarte Cross';  -- 265 500 (2024), wikipedia.org
update public.festivals set size_band = '10000_50000' where name = 'Bergenfest';  -- 30 000 (2026), yourope.org
update public.festivals set size_band = '10000_50000' where name = 'Palmesus';  -- 40 000 (2026), palmesus.com (nesten 40 000)
update public.festivals set size_band = '10000_50000' where name = 'Piknik i Parken';  -- 12 000 (2025), iqmagazine.com (kapasitet)
update public.festivals set size_band = '50000_100000' where name = 'Stavernfestivalen';  -- 80 000 (2019), iqmagazine.com
update public.festivals set size_band = 'over_100000' where name = 'Tons of Rock';  -- 150 000 (2026), tonsofrock.no
update public.festivals set size_band = '50000_100000' where name = 'Øyafestivalen';  -- 50 000+ (2025), travelandtourworld.com
update public.festivals set size_band = 'over_100000' where name = 'Open''er Festival';  -- 140 000+ (2025), opener.pl
update public.festivals set size_band = 'over_100000' where name = 'Pol''and''Rock Festival';  -- 750 000 (2019), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'NOS Alive';  -- 155 000 (2024), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Vodafone Paredes de Coura';  -- 115 000 (2023), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Beach, Please!';  -- 500 000+ (2025), wikipedia.org
update public.festivals set size_band = '10000_50000' where name = 'Jazz in the Park';  -- 21 000 (2026), jazzinthepark.ro (kapasitet 7 000 per dag × 3)
update public.festivals set size_band = 'over_100000' where name = 'Untold Festival';  -- 470 000 (2025), romania-insider.com
update public.festivals set size_band = '10000_50000' where name = 'Pohoda';  -- 30 000 (2026), pollstar.com (kapasitet)
update public.festivals set size_band = '2000_10000' where name = 'Punk Rock Holiday';  -- 5 000 (2025), culture.si (kapasitet)
update public.festivals set size_band = 'over_100000' where name = 'Arenal Sound';  -- 240 000 (2026), cadenaser.com
update public.festivals set size_band = 'over_100000' where name = 'Bilbao BBK Live';  -- 115 000+ (2025), cadenaser.com
update public.festivals set size_band = '50000_100000' where name = 'Cruïlla Barcelona';  -- 76 000 (2023), cruillabarcelona.cat
update public.festivals set size_band = 'over_100000' where name = 'FIB Benicàssim';  -- 135 000 (2025), cadenaser.com (samme festival som Festival Internacional de Benicàssim)
update public.festivals set size_band = 'over_100000' where name = 'Festival Internacional de Benicàssim';  -- 135 000 (2025), cadenaser.com (samme festival som FIB Benicàssim)
update public.festivals set size_band = '50000_100000' where name = 'Mallorca Live Festival';  -- 60 000 (2025), rollingstone.co.uk
update public.festivals set size_band = 'over_100000' where name = 'Medusa Festival';  -- 180 000 (2025), ondacero.es
update public.festivals set size_band = '50000_100000' where name = 'Monegros Desert Festival';  -- 60 000+ (2026), efe.com
update public.festivals set size_band = 'over_100000' where name = 'O Son do Camiño';  -- 132 000 (2023), carrishoteles.com
update public.festivals set size_band = 'over_100000' where name = 'Primavera Sound';  -- 293 000 (2025), catalannews.com
update public.festivals set size_band = 'over_100000' where name = 'Resurrection Fest';  -- 141 376 (2025), lavozdegalicia.es
update public.festivals set size_band = 'over_100000' where name = 'Rototom Sunsplash';  -- 218 000 (2025), rototomsunsplash.com
update public.festivals set size_band = 'over_100000' where name = 'Sónar Barcelona';  -- 161 000 (2025), catalannews.com
update public.festivals set size_band = 'over_100000' where name = 'Viña Rock';  -- 240 000 (2025), cadenaser.com (forventet/kapasitet)
update public.festivals set size_band = '50000_100000' where name = 'Boardmasters Festival';  -- 58 000 (2025), wikipedia.org (kapasitet)
update public.festivals set size_band = '50000_100000' where name = 'Boomtown';  -- 70 000+ (2025), areal.world
update public.festivals set size_band = '50000_100000' where name = 'Creamfields';  -- 70 000+ (2025), musicfestivalwizard.com
update public.festivals set size_band = '50000_100000' where name = 'Download Festival';  -- 75 000 (2025), wikipedia.org (anslag 75 000–80 000)
update public.festivals set size_band = 'over_100000' where name = 'Glastonbury Festival';  -- 210 000 (2025), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Latitude Festival';  -- 160 000 (2025), latitudefestival.com (kapasitet 40 000 per dag × 4)
update public.festivals set size_band = '50000_100000' where name = 'Parklife Festival';  -- 80 000 (2025), itv.com
update public.festivals set size_band = 'over_100000' where name = 'Reading and Leeds Festivals';  -- 200 000 (2025), adrenalinemag.co.uk (nesten 200 000)
update public.festivals set size_band = 'over_100000' where name = 'TRNSMT';  -- 150 000 (2025), thescottishsun.co.uk
update public.festivals set size_band = 'over_100000' where name = 'Wireless Festival';  -- 150 000+ (2025), bpm-sfx.com
update public.festivals set size_band = '50000_100000' where name = 'Gurtenfestival';  -- 98 500 (2025), swissinfo.ch
update public.festivals set size_band = 'over_100000' where name = 'Montreux Jazz Festival';  -- 250 000 (2025), montreuxjazzfestival.com
update public.festivals set size_band = 'over_100000' where name = 'Paléo Festival';  -- 250 000+ (2025), meyersound.com
update public.festivals set size_band = '50000_100000' where name = 'Zürich Openair';  -- 87 000 (2025), bluewin.ch
update public.festivals set size_band = '10000_50000' where name = 'Sweden Rock Festival';  -- 40 000 (2026), omni.se
update public.festivals set size_band = '50000_100000' where name = 'Way Out West';  -- 78 000 (2025), facebook.com (Way Out West)
update public.festivals set size_band = '50000_100000' where name = 'Rock for People';  -- 50 000+ (2025), pollstar.com
update public.festivals set size_band = 'over_100000' where name = 'Airbeat One';  -- 210 000 (2026), deutschlandfunk.de
update public.festivals set size_band = '50000_100000' where name = 'Deichbrand';  -- 60 000 (2026), hamburg.de
update public.festivals set size_band = '50000_100000' where name = 'Hurricane Festival';  -- 78 000 (2026), pollstar.com
update public.festivals set size_band = '50000_100000' where name = 'Nature One';  -- 65 000 (2025), wikipedia.org
update public.festivals set size_band = 'over_100000' where name = 'Parookaville';  -- 225 000 (2025), iqmagazine.com (75 000 per dag × 3)
update public.festivals set size_band = '50000_100000' where name = 'Rock am Ring';  -- 90 000 (2025), wikipedia.org
update public.festivals set size_band = '50000_100000' where name = 'Rock im Park';  -- 80 000 (2026), welt.de
update public.festivals set size_band = '50000_100000' where name = 'Southside Festival';  -- 59 000 (2026), pollstar.com
update public.festivals set size_band = '50000_100000' where name = 'Wacken Open Air';  -- 85 000 (2026), welt.de
update public.festivals set size_band = 'over_100000' where name = 'Sziget Festival';  -- 416 000 (2025), hungarytoday.hu
update public.festivals set size_band = 'over_100000' where name = 'Electric Love Festival';  -- 180 000 (2026), facebook.com (Land Salzburg)
update public.festivals set size_band = 'over_100000' where name = 'Nova Rock Festival';  -- 220 000 (2026), fm4.orf.at
