-- =====================================================================
-- My Voice Life — PRE-FLIGHT INSPECTION (READ-ONLY)
-- Run in Supabase Dashboard → SQL Editor on the target project BEFORE
-- approving the migration, and share the results (they contain no secrets,
-- only schema info and row COUNTS — no emails or personal data).
-- The whole script runs in a READ ONLY transaction: Postgres rejects any write.
-- =====================================================================
begin transaction read only;

-- 1. Tables in the public schema with row counts
select 'public tables' as section, c.relname as name,
       (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text as rows,
       c.relrowsecurity as rls_enabled
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by 2;

-- 2. Tables this migration creates that ALREADY exist (expected: none)
select 'name collisions' as section, t as table_name
from unnest(array['categories','voice_sessions','notes','tasks','reminders','events','subscriptions','usage_counters']) t
where to_regclass('public.' || t) is not null;

-- 3. Current structure of public.profiles
select 'profiles columns' as section, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'profiles' order by ordinal_position;

select 'profiles constraints' as section, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid = to_regclass('public.profiles');

-- 4. Existing RLS policies (the migration REPLACES those on profiles)
select 'policies' as section, tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- 5. Triggers on auth.users (sign-up logic) and their functions
select 'auth.users triggers' as section, t.tgname, p.proname as function_name, t.tgenabled
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal order by t.tgname;

-- 6. Functions whose names this migration uses (expected: none, or only mvl_*)
select 'function name collisions' as section, proname, pg_get_function_identity_arguments(oid) as args
from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('mvl_set_updated_at','mvl_handle_new_user','tasks_completed_at','effective_plan','plan_limits','enforce_note_quota','search_memory');

-- 7. Data checks that could make constraints fail (counts only)
select 'auth users' as section, count(*) as total from auth.users;
select 'profiles without auth user (orphans)' as section, count(*) from public.profiles p
  where to_regclass('public.profiles') is not null and not exists (select 1 from auth.users u where u.id = p.id);

-- 8. Extensions and Postgres version
select 'extensions' as section, extname, extversion from pg_extension order by 2;
select 'version' as section, version();

rollback;
