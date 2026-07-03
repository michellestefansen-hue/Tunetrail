alter table festivals
  add column category text
  check (category in (
    'Rock & Metal',
    'Pop & Mainstream',
    'Elektronisk & Dans',
    'Hip-Hop & R&B',
    'Folk & Vise',
    'Blandet/Flersjanger'
  ));
