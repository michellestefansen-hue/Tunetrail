-- Neversea's row was removed from festival_data_master.xlsx (confirmed
-- intentional). festival_editions cascades on delete, so no separate cleanup
-- is needed there.
delete from festivals where slug = 'neversea';
