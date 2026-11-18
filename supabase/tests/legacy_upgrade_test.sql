-- Runs AFTER the migration on top of legacy_fitpick_fixture.sql.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if; end $$;
create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'PASS  %', label; return; end;
  raise exception 'FAIL  % (statement succeeded but should have failed)', label;
end $$;
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

-- ---------- No data loss ----------
select pg_temp.expect((select count(*) = 2 from public.profiles), 'existing profile rows kept (2)');
select pg_temp.expect(
  (select string_agg(concat_ws(',', id, email, is_pro, photos_used), '|' order by id) from public.profiles)
  = '11111111-0000-0000-0000-000000000001,fitpick-pro@test,t,2|22222222-0000-0000-0000-000000000002,fitpick-free@test,f,1',
  'legacy profile values (email, is_pro, photos_used) unchanged');
select pg_temp.expect(
  (select md5(string_agg(o::text, '|' order by id)) from public.outfits o) = (select h from public._before where t = 'outfits'),
  'outfits table byte-for-byte unchanged');
select pg_temp.expect((select count(*) = 1 from pg_policies where tablename = 'outfits'), 'outfits policies untouched');
select pg_temp.expect((select prosrc like '%email%' from pg_proc where proname = 'handle_new_user' and pronamespace = 'public'::regnamespace),
  'FitPick handle_new_user() NOT overwritten');

-- ---------- Existing users are bootstrapped without overwriting anything ----------
select pg_temp.expect((select count(*) = 2 from public.subscriptions where plan = 'free'), 'existing users get a free plan row');
select pg_temp.expect((select bool_and(ui_language = 'en' and timezone = 'UTC') from public.profiles), 'new preference columns filled with defaults');

-- ---------- Security hole closed ----------
select pg_temp.expect((select count(*) = 0 from pg_policies where tablename = 'profiles' and policyname like 'Public profiles%'),
  'permissive "public profiles" policy removed');
select pg_temp.as_user('22222222-0000-0000-0000-000000000002');
select pg_temp.expect((select count(*) = 1 from public.profiles), 'user can no longer read other users'' profiles/emails');
select pg_temp.expect_error($$update public.profiles set is_pro = true$$, 'user can no longer self-upgrade via is_pro');
select pg_temp.expect_error($$update public.profiles set photos_used = 0$$, 'user can no longer reset photos_used');
update public.profiles set timezone = 'Africa/Kigali';
select pg_temp.expect((select timezone = 'Africa/Kigali' from public.profiles), 'user can still update own preferences');
reset role;

-- ---------- Sign-up still works with BOTH triggers present ----------
insert into auth.users (id, email) values ('33333333-0000-0000-0000-000000000003', 'new@test');
select pg_temp.expect((select email = 'new@test' from public.profiles where id = '33333333-0000-0000-0000-000000000003'),
  'new sign-up: FitPick trigger still sets email (no conflict)');
select pg_temp.expect((select count(*) = 7 from public.categories where user_id = '33333333-0000-0000-0000-000000000003'),
  'new sign-up: My Voice Life trigger adds 7 categories');

-- ---------- Account deletion ----------
delete from auth.users where id = '22222222-0000-0000-0000-000000000002';
select pg_temp.expect((select count(*) = 0 from public.profiles where id = '22222222-0000-0000-0000-000000000002'), 'deleting a legacy user removes the profile');

\echo 'ALL LEGACY UPGRADE TESTS PASSED'
