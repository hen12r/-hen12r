#!/usr/bin/env bash
# Applies every migration to a throwaway Postgres database (with a Supabase shim)
# and runs the RLS test suite. Requires a local Postgres; set PGHOST/PGPORT/PGUSER.
# It creates and drops a database named mvl_test — never point it at production.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=mvl_test
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
for r in anon authenticated service_role; do psql -q -d postgres -c "drop role if exists $r" >/dev/null 2>&1 || true; done
psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/supabase_shim.sql
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql -v ON_ERROR_STOP=1 -q -d $DB -f "$f"
done
# Re-apply to prove the migration is idempotent.
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d $DB -f "$f"; done
echo "Migrations are re-runnable"
PGOPTIONS="" psql -v ON_ERROR_STOP=1 -d $DB -f supabase/tests/rls_test.sql 2>&1 | sed -n 's/^.*NOTICE:  //p; /PASSED/p; /FAIL/p; /ERROR/p'
psql -q -d postgres -c "drop database $DB"
