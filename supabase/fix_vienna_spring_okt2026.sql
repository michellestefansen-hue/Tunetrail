-- Vienna Spring Festival hadde ogsaa «Techno & House», ikke bare
-- «Elektronisk & Dans» som forrige fil fjernet. Programmet er Carmen og
-- Suor Angelica / Cleopatre -- opera. Begge taggene er feil.

begin;
update festivals
   set tags = array_remove(array_remove(tags, 'Techno & House'), 'Elektronisk & Dans')
 where slug = 'vienna-spring-festival';
commit;

select name, category, tags from festivals where slug = 'vienna-spring-festival';
