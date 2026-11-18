-- RLS / data-isolation / quota tests. Run via scripts/test-db.sh.
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'PASS  %', label;
    return;
  end;
  raise exception 'FAIL  % (statement succeeded but should have failed)', label;
end $$;

create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if;
end $$;

-- Two users. The auth trigger should bootstrap profile, plan and categories.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test');

select pg_temp.expect((select count(*) = 2 from public.profiles), 'profiles bootstrapped for new users');
select pg_temp.expect((select count(*) = 14 from public.categories), '7 default categories per user');
select pg_temp.expect((select count(*) = 2 from public.subscriptions where plan = 'free'), 'users start on free plan');

-- ---------- User A creates data ----------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.notes (body, title) values ('Business idea: solar kiosks in Kigali', 'Solar idea');
insert into public.tasks (title, due_date) values ('Call my school', current_date + 1);
insert into public.reminders (title, remind_at, timezone) values ('Practise piano', now() + interval '1 day', 'Africa/Kigali');
insert into public.events (title, starts_at) values ('Exam', now() + interval '3 days');
select pg_temp.expect((select count(*) = 1 from public.notes), 'A sees own note');
select pg_temp.expect((select count(*) = 7 from public.categories), 'A sees only own categories');
select pg_temp.expect((select count(*) = 1 from public.search_memory('solar')), 'A finds own note via search_memory');
select pg_temp.expect((select count(*) = 1 from public.search_memory('Kig')), 'partial-word search falls back to ILIKE');

select pg_temp.expect_error($$insert into public.notes (user_id, body) values ('bbbbbbbb-0000-0000-0000-000000000002', 'spoof')$$,
  'A cannot insert a note owned by B');
select pg_temp.expect_error($$update public.profiles set id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
  'A cannot change profile id');
select pg_temp.expect_error($$update public.subscriptions set plan = 'premium'$$,
  'A cannot self-upgrade to premium');
select pg_temp.expect_error($$insert into public.subscriptions (user_id, plan) values ('aaaaaaaa-0000-0000-0000-000000000001', 'premium')$$,
  'A cannot insert a subscription');
select pg_temp.expect_error($$update public.usage_counters set notes_created = 0$$,
  'A cannot reset usage counters');
update public.profiles set timezone = 'Africa/Kigali', ui_language = 'fr';
select pg_temp.expect((select timezone = 'Africa/Kigali' from public.profiles), 'A can update own preferences');
select pg_temp.expect_error($$update public.profiles set ui_language = 'xx'$$, 'invalid language rejected');
reset role;

-- ---------- User B tries to reach A's data ----------
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.expect((select count(*) = 0 from public.notes), 'B cannot read A notes');
select pg_temp.expect((select count(*) = 0 from public.tasks), 'B cannot read A tasks');
select pg_temp.expect((select count(*) = 0 from public.reminders), 'B cannot read A reminders');
select pg_temp.expect((select count(*) = 0 from public.events), 'B cannot read A events');
select pg_temp.expect((select count(*) = 1 from public.profiles), 'B sees only own profile');
select pg_temp.expect((select count(*) = 0 from public.search_memory('solar')), 'search_memory does not leak A data to B');
update public.notes set body = 'hacked';
delete from public.tasks;
reset role;
select pg_temp.expect((select body = 'Business idea: solar kiosks in Kigali' from public.notes), 'B update on A note had no effect');
select pg_temp.expect((select count(*) = 1 from public.tasks), 'B delete on A task had no effect');

-- B cannot attach A's category to B's own note (composite FK)
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
reset role;
do $$
declare a_cat uuid;
begin
  select id into a_cat from public.categories where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1;
  perform set_config('test.a_cat', a_cat::text, false);
end $$;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.expect_error(format($$insert into public.notes (body, category_id) values ('x', %L)$$, current_setting('test.a_cat')),
  'B cannot reference A category');
reset role;

-- ---------- Anonymous ----------
select set_config('request.jwt.claims', '', false);
set role anon;
select pg_temp.expect_error('select count(*) from public.notes', 'anon cannot read notes');
select pg_temp.expect_error($$select * from public.search_memory('solar')$$, 'anon cannot call search_memory');
reset role;

-- ---------- Free plan quota ----------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.notes (body) select 'note ' || g from generate_series(2, 7) g;
select pg_temp.expect((select count(*) = 7 from public.notes), 'free user can save 7 notes');
select pg_temp.expect_error($$insert into public.notes (body) values ('eighth')$$, '8th note blocked on free plan');
delete from public.notes where body = 'note 7';
select pg_temp.expect_error($$insert into public.notes (body) values ('after delete')$$, 'deleting a note does not restore quota');
reset role;

update public.subscriptions set plan = 'premium' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.notes (body) values ('premium note');
select pg_temp.expect(true, 'premium user is not limited');
reset role;

update public.subscriptions set status = 'canceled' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.expect_error($$insert into public.notes (body) values ('after cancel')$$, 'canceled subscription falls back to free limits');
reset role;

-- ---------- Task completion bookkeeping ----------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update public.tasks set status = 'done';
select pg_temp.expect((select completed_at is not null from public.tasks), 'completed_at set when task done');
update public.tasks set status = 'open';
select pg_temp.expect((select completed_at is null from public.tasks), 'completed_at cleared when reopened');
reset role;

-- ---------- Account deletion cascades ----------
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.expect((select count(*) = 0 from public.notes where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'deleting user removes all their data');
select pg_temp.expect((select count(*) = 7 from public.categories), 'other user data untouched by deletion');

\echo 'ALL DATABASE TESTS PASSED'
