-- Kategorifeil funnet ved gjennomgang av rock/metal-guiden 2026-09-13.
-- Vurdert paa line-up, ikke paa navn eller tagger.
--
-- `category` er festivalens hovedsjanger. Den brukes ikke av guiden -- den
-- filtrerer paa tagger -- men den er feil paa disse tre, og en feil
-- hovedsjanger er verdt aa rette uansett hvem som leser den.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Viña Rock sto som Hip-Hop & R&B. Plakaten er rock, metal og punk, og navnet
-- sier det selv. Hip-Hop-taggen er ikke feil -- festivalen booker ogsaa rap --
-- men den er ikke hovedsjangeren.
update festivals set category = 'Rock & Alternativ' where slug = 'vina-rock';

-- Sziget sto som Metal. Festivalen har ti sjangertagger og en plakat som
-- spenner fra pop til jazz til verdensmusikk. Den er allerede holdt utenfor
-- rock/metal-guiden av tagg-regelen, men kategorien ga feil inntrykk.
update festivals set category = 'Blandet/Flersjanger' where slug = 'sziget-festival';

-- «Crescendo association» er ikke et festivalnavn, men foreningen bak
-- Festival Crescendo i Saint-Palais-sur-Mer. Plakaten -- Edensong, La Maschera
-- di Cera, The Emerald Dawn, Discipline -- er progressiv rock hele veien.
update festivals
   set name = 'Festival Crescendo',
       slug = 'festival-crescendo',
       city = 'Saint-Palais-sur-Mer',
       category = 'Rock & Alternativ'
 where slug = 'crescendo-association';

commit;

select name, slug, city, category, tags
  from festivals
 where slug in ('vina-rock', 'sziget-festival', 'festival-crescendo');
