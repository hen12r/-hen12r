#!/usr/bin/env bash
# Database tests against a THROWAWAY local Postgres (with a Supabase shim). Never point at production.
# Requires PGHOST/PGPORT/PGUSER for a local server. Scenarios:
#   fresh   — empty project: migration (atomic, re-runnable) + RLS/isolation/quota suite
#   legacy  — simulated FitPick project: migration must keep all data and close the old holes
#   guard   — conflicting pre-existing table: migration must abort and change nothing
set -euo pipefail
cd "$(dirname "$0")/.."
QUIET="-c client_min_messages=warning"
MIGRATIONS=(supabase/migrations/*.sql)

reset_db() {
  PGOPTIONS="$QUIET" psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $1" -c "create database $1"
  for r in anon authenticated service_role; do PGOPTIONS="$QUIET" psql -q -d postgres -c "drop role if exists $r" >/dev/null 2>&1 || true; done
  PGOPTIONS="$QUIET" psql -v ON_ERROR_STOP=1 -q -d "$1" -f supabase/tests/supabase_shim.sql
}
migrate() { for f in "${MIGRATIONS[@]}"; do PGOPTIONS="$QUIET" psql -v ON_ERROR_STOP=1 -q --single-transaction -d "$1" -f "$f"; done; }
run_test() { psql -v ON_ERROR_STOP=1 -d "$1" -f "$2" 2>&1 | sed -n 's/^.*NOTICE:  //p; /PASSED/p; /FAIL/p; /ERROR/p'; }

echo "== Scenario: fresh project"
reset_db mvl_test
migrate mvl_test && migrate mvl_test && echo "Migration applies atomically and is re-runnable"
run_test mvl_test supabase/tests/rls_test.sql

echo "== Scenario: legacy FitPick project"
reset_db mvl_test
PGOPTIONS="$QUIET" psql -v ON_ERROR_STOP=1 -q -d mvl_test -f supabase/tests/legacy_fitpick_fixture.sql
migrate mvl_test
run_test mvl_test supabase/tests/legacy_upgrade_test.sql

echo "== Scenario: conflicting table aborts the migration"
reset_db mvl_test
psql -q -d mvl_test -c "create table public.notes (id serial primary key, text text)"
if migrate mvl_test 2>/tmp/mvl_guard.err; then echo "FAIL  migration should have aborted"; exit 1; fi
grep -q "MVL pre-flight" /tmp/mvl_guard.err && echo "PASS  aborted with pre-flight message"
[ "$(psql -tA -d mvl_test -c "select count(*) from pg_tables where schemaname='public' and tablename in ('categories','tasks','profiles')")" = "0" ] \
  && echo "PASS  nothing was created (rolled back)" || { echo "FAIL  partial changes left behind"; exit 1; }
echo "ALL GUARD TESTS PASSED"

PGOPTIONS="$QUIET" psql -q -d postgres -c "drop database mvl_test"
