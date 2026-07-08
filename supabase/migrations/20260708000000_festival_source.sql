-- Provenance so imports are idempotent and traceable across sources
-- (wikidata = canonical registry, ticketmaster = enrichment, manual = admin).
alter table festivals add column if not exists source text;
alter table festivals add column if not exists external_id text;

-- Nulls are distinct in Postgres, so existing rows without an external_id are unaffected.
create unique index if not exists festivals_source_external_id_key
  on festivals (source, external_id);
