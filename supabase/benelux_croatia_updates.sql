-- 8 festivals in this batch already existed. Merged the better value per field:
--   * coordinates from the spreadsheet wherever the stored point was off by
--     more than 2 km -- several Wikidata-sourced rows were wildly wrong
--     (Leffingeleuren 224 km, Alcatraz 135 km, Lokerse Feesten 51 km).
--   * tags are the union of both, so the earlier hand-curated tagging is kept.
--   * venue/website kept from the database except where the spreadsheet was
--     clearly better; the spreadsheet's Leffingeleuren and Draaimolen 'website'
--     values are a Livenation ticket link and a deep FAQ link, so both were
--     rejected in favour of the official sites already stored.
-- Dates matched everywhere -- nothing to correct.

-- Lokerse Feesten
update festivals set
  latitude = 51.1075, longitude = 3.9874,
  tags = array['Rock','Metal','Punk & Hardcore','Pop & Mainstream','Elektronisk & Dans','Hip-Hop & R&B','Alternativ & Indie','Techno & House']::text[],
  website_url = 'https://www.lokersefeesten.be/en/'
where slug = 'lokerse-feesten';

-- Leffingeleuren
update festivals set
  latitude = 51.1754, longitude = 2.8771,
  tags = array['Rock','Alternativ & Indie','Elektronisk & Dans','Punk & Hardcore']::text[]
where slug = 'leffingeleuren';

-- Lowlands
update festivals set
  latitude = 52.4388, longitude = 5.7661,
  tags = array['Rock','Metal','Punk & Hardcore','Alternativ & Indie','Pop & Mainstream','Elektronisk & Dans','Techno & House','Hip-Hop & R&B','Jazz','Verden & Reggae']::text[],
  venue_name = 'Evenemententerrein Walibi Holland'
where slug = 'lowlands';

-- Draaimolen Festival
update festivals set
  latitude = 51.5795, longitude = 5.0073,
  tags = array['Elektronisk & Dans','Techno & House','Alternativ & Indie']::text[]
where slug = 'draaimolen-festival';

-- Draaimolen has no ticket_url set here on purpose: the spreadsheet's link
-- points at an FAQ tab rather than a ticket shop.

-- Appelpop
update festivals set
  tags = array['Rock','Pop & Mainstream','Alternativ & Indie','Hip-Hop & R&B']::text[]
where slug = 'appelpop';

-- Dubrovnik Summer Festival
update festivals set
  venue_name = 'Historiske palasser, fort og scener i gamlebyen'
where slug = 'dubrovnik-summer-festival';

-- Alcatraz Open Air  (i basen som «Alcatraz Metal Festival»)
update festivals set
  latitude = 50.8075, longitude = 3.2738,
  tags = array['Metal','Rock','Punk & Hardcore']::text[],
  website_url = 'https://www.alcatraz.be/en/'
where slug = 'alcatraz-metal-festival';
