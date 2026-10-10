-- To festivaler ligger i elektronikasettet uten aa hoere hjemme der.
-- Funnet ved klassifisering av undersjangre 2026-10-10, vurdert paa
-- line-up og kilder -- ikke paa navn.
--
-- Kjoeres i Supabase SQL Editor.

begin;

-- Les Ardentes i Liege startet som elektro-rock i 2006, men plakaten er i
-- dag foerst og fremst rap og urban. En opptelling av 2026-utgaven gir 166
-- hiphop-artister mot 144 elektroniske, og arrangoeren markedsfoerer den
-- som en hiphop- og urbanfestival. Elektronisk er en reell del av den, men
-- ikke hovedsjangeren -- kategorien flyttes, taggen blir staaende.
-- Kilde: info-lux.com, frontstagefestivals.com
update festivals
   set category = 'Hip-Hop & R&B'
 where slug = 'les-ardentes';

-- Canal Street i Arendal het Arendal Jazz & Blues Festival til 2006 og har
-- jazz som kjerne fremdeles. Programmet er bredt -- jazz, blues, rock, pop,
-- verdensmusikk og noe elektronisk -- men en elektronisk tagg gjoer den til
-- en kandidat for elektronikaguiden, der den ikke hoerer hjemme.
-- Kilde: no.wikipedia.org, europejazz.net
update festivals
   set tags = array_remove(tags, 'Elektronisk & Dans'),
       category = 'Jazz & Soul'
 where slug = 'canal-street';

commit;

select name, category, tags from festivals
 where slug in ('les-ardentes', 'canal-street');
