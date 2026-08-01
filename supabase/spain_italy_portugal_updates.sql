-- Fills only the venue_name gap for 2 already-existing festivals where the
-- database had no value. All other fields (tags, coordinates, dates,
-- website) are left untouched for existing festivals per user instruction
-- that DB data may already be more correct -- see chat for flagged
-- discrepancies to review manually.

update festivals set venue_name = 'Centro Cultural Vila Flor' where slug = 'guimaraes-jazz' and venue_name is null;
update festivals set venue_name = 'Piazza del Popolo og flere steder' where slug = 'time-in-jazz' and venue_name is null;
