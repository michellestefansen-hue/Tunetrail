-- LaRock Music Festival 2026 (13.-16. august) er meldt avlyst.
-- Ingen 'avlyst'-status finnes i skjemaet, og programmet var allerede tomt,
-- så det eneste sporet av avlysningen er selve 2026-utgaven.
--
-- Dette sletter RADEN for 2026-utgaven, ikke festivalen selv -- festivalen
-- blir stående (uten kommende utgave) i tilfelle den kommer tilbake senere.
-- Kjør kun denne linjen hvis du vil at Tunetrail skal slutte å vise 2026-
-- utgaven. Ikke bundlet med de andre filene, siden sletting er irreversibelt.

delete from festival_editions e
using festivals f
where e.festival_id = f.id and f.slug = 'larock-music-festival' and e.year = 2026;
