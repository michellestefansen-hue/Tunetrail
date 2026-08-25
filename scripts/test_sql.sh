#!/usr/bin/env bash
# Kjør migrasjonene og SQL-testene mot en midlertidig PostgreSQL.
#
# Databasen opprettes fra bunnen hver gang og slettes etterpå. Ingenting her
# rører Supabase -- det er hele poenget: reglene i guard_robot_submission skal
# kunne prøves uten å legge en eneste rad i den ekte basen.
#
#   scripts/test_sql.sh
#
# Krever PostgreSQL installert lokalt (psql + initdb). Migrasjonene kjøres i
# rekkefølgen under, ikke i filnavnrekkefølge: filnavnene innenfor samme dato
# sorterer alfabetisk, og da kommer apply_program før tabellen den skriver til.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PORT=${PGPORT:-54329}
DIR=$(mktemp -d)
trap 'su postgres -c "$PGBIN/pg_ctl -D $DIR/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

chmod 755 "$DIR"
mkdir -p "$DIR/data" "$DIR/log"
chown postgres:postgres "$DIR/data" "$DIR/log"
chmod 700 "$DIR/data"

su postgres -c "$PGBIN/initdb -D $DIR/data -A trust -U postgres" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k /tmp' -l $DIR/log/pg.log start" >/dev/null
sleep 1

PSQL="psql -h /tmp -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

MIGRATIONS=(
  20260703000000_init_festivals_schema.sql
  20260703010000_add_festival_image_url.sql
  20260703020000_add_festival_category.sql
  20260703030000_europe_expansion.sql
  20260708000000_festival_source.sql
  20260708100000_festival_editions.sql
  20260802_profiles.sql
  20260802_submissions.sql
  20260802_submission_group.sql
  20260802_apply_submission.sql
  20260802_apply_program.sql
  20260802_apply_new_festival.sql
  20260802_artist_names.sql
  20260802_fix_null_conflict.sql
  20260802_rls_lockdown.sql
  20260803_festival_size.sql
  20260808_edition_dates.sql
  20260808_festival_watch.sql
  20260825_robot_identity.sql
  20260825_ai_queue.sql
)

echo "→ stillas"
$PSQL -f "$ROOT/supabase/test/00_stub_supabase.sql"

echo "→ migrasjoner"
for m in "${MIGRATIONS[@]}"; do
  printf '   %s\n' "$m"
  $PSQL -f "$ROOT/supabase/migrations/$m"
done

echo "→ tester"
status=0
for t in "$ROOT"/supabase/test/*.test.sql; do
  printf '   %s\n' "$(basename "$t")"
  if ! $PSQL -f "$t"; then status=1; fi
done

if [ $status -eq 0 ]; then echo "alle tester passerte"; else echo "TESTER FEILET"; fi
exit $status
