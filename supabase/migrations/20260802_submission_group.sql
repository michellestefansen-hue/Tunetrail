-- Ett bidrag kan endre både detaljer og program. Bidragsyteren fyller ut begge
-- faner og trykker send én gang.
--
-- Under lagres det fortsatt som to rader, fordi et feltforslag og et
-- programforslag vurderes på helt ulike måter -- felt for felt mot gammel
-- verdi, versus tre lister med operasjoner. group_id binder dem sammen, slik
-- at køen viser dem som ett bidrag i stedet for to som tilfeldigvis kom
-- samtidig.

alter table public.submissions
  add column if not exists group_id uuid;

create index if not exists submissions_group_idx
  on public.submissions (group_id);

comment on column public.submissions.group_id is
  'Felles id for rader som ble sendt inn samtidig av samme bidragsyter. '
  'Null for enkeltstående forslag.';
