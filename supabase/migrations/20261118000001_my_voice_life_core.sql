-- =====================================================================
-- My Voice Life — core schema
-- ---------------------------------------------------------------------
-- Safe to apply to a project that already holds the old FitPick schema:
--   * public.profiles is created only if missing; existing rows are kept.
--   * public.outfits (FitPick) is NOT touched.
--   * Existing policies on public.profiles are replaced with owner-only
--     policies (the old ones were never reviewed and may be permissive).
-- Every user-owned table has RLS enabled with owner-only policies.
-- Billing/entitlement data is writable by the service role only.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Pre-flight guards: abort (and roll back) instead of building on a schema
-- we do not understand. Nothing is changed if any of these fail.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  expected_col text;
begin
  -- Tables this migration creates must either not exist, or already be ours.
  foreach t in array array['categories', 'voice_sessions', 'notes', 'tasks', 'reminders', 'events', 'subscriptions', 'usage_counters'] loop
    if to_regclass('public.' || t) is not null then
      expected_col := case t when 'subscriptions' then 'plan' when 'usage_counters' then 'notes_created' else 'user_id' end;
      if not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = t and column_name = expected_col) then
        raise exception 'MVL pre-flight: table public.% already exists with a different structure (no column %). Review it before migrating.', t, expected_col;
      end if;
    end if;
  end loop;

  if to_regclass('public.profiles') is not null then
    -- ON CONFLICT (id) below needs a unique index on profiles.id.
    if not exists (
      select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = 'public.profiles'::regclass and i.indisunique and i.indnkeyatts = 1 and a.attname = 'id'
    ) then
      raise exception 'MVL pre-flight: public.profiles.id has no primary key / unique index.';
    end if;
    if (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') <> 'uuid' then
      raise exception 'MVL pre-flight: public.profiles.id is not uuid.';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.mvl_set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profiles (one row per auth user; also holds user preferences)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists ui_language text not null default 'en',
  add column if not exists speech_language text not null default 'auto',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists daily_briefing_enabled boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.profiles add constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_ui_language_chk check (ui_language in ('en', 'fr', 'rw'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_speech_language_chk check (speech_language in ('auto', 'en', 'fr', 'rw'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_timezone_len check (char_length(timezone) between 1 and 64);
exception when duplicate_object then null; end $$;

-- Make account deletion remove the profile too. NOT VALID: enforced for new/changed
-- rows only, existing rows are not checked or modified.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass
  ) then
    alter table public.profiles add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users (id) on delete cascade not valid;
  end if;
end $$;

drop trigger if exists mvl_profiles_updated_at on public.profiles;
create trigger mvl_profiles_updated_at before update on public.profiles
  for each row execute function public.mvl_set_updated_at();

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  -- Lets child tables use a composite FK so a row can only point at
  -- a category owned by the same user.
  unique (id, user_id)
);
create unique index if not exists categories_user_name_uq on public.categories (user_id, lower(name));

-- ---------------------------------------------------------------------
-- Voice sessions (one per capture; transcript only — audio is never stored)
-- ---------------------------------------------------------------------
create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('voice', 'text')),
  transcript text check (transcript is null or char_length(transcript) <= 20000),
  detected_language text,
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 3600000),
  provider text,
  status text not null default 'extracted' check (status in ('transcribed', 'extracted', 'failed', 'committed')),
  error text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists voice_sessions_user_created_idx on public.voice_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Notes (notes, ideas, personal information)
-- ---------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  voice_session_id uuid,
  kind text not null default 'note' check (kind in ('note', 'idea', 'personal_info')),
  title text check (title is null or char_length(title) <= 200),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  language text,
  is_pinned boolean not null default false,
  search tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || body)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (voice_session_id, user_id) references public.voice_sessions (id, user_id) on delete set null (voice_session_id)
);
create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);
create index if not exists notes_search_idx on public.notes using gin (search);

-- ---------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  voice_session_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  details text check (details is null or char_length(details) <= 5000),
  status text not null default 'open' check (status in ('open', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,          -- the user's local calendar day
  due_at timestamptz,     -- only when a specific time was stated
  completed_at timestamptz,
  search tsvector generated always as (to_tsvector('simple', title || ' ' || coalesce(details, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (voice_session_id, user_id) references public.voice_sessions (id, user_id) on delete set null (voice_session_id)
);
create index if not exists tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index if not exists tasks_search_idx on public.tasks using gin (search);

create or replace function public.tasks_completed_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status = 'open' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists tasks_completed_at on public.tasks;
create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.tasks_completed_at();

-- ---------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  voice_session_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  notes text check (notes is null or char_length(notes) <= 5000),
  remind_at timestamptz not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled')),
  last_notified_at timestamptz,
  search tsvector generated always as (to_tsvector('simple', title || ' ' || coalesce(notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (voice_session_id, user_id) references public.voice_sessions (id, user_id) on delete set null (voice_session_id)
);
create index if not exists reminders_user_status_at_idx on public.reminders (user_id, status, remind_at);
-- For the future delivery worker: scan due reminders across users.
create index if not exists reminders_due_idx on public.reminders (remind_at) where status = 'scheduled';
create index if not exists reminders_search_idx on public.reminders using gin (search);

-- ---------------------------------------------------------------------
-- Calendar events
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  voice_session_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  notes text check (notes is null or char_length(notes) <= 5000),
  location text check (location is null or char_length(location) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  search tsvector generated always as (to_tsvector('simple', title || ' ' || coalesce(notes, '') || ' ' || coalesce(location, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (voice_session_id, user_id) references public.voice_sessions (id, user_id) on delete set null (voice_session_id)
);
create index if not exists events_user_starts_idx on public.events (user_id, starts_at);
create index if not exists events_search_idx on public.events using gin (search);

do $$
declare t text;
begin
  foreach t in array array['notes', 'tasks', 'reminders', 'events'] loop
    execute format('drop trigger if exists %1$s_updated_at on public.%1$s', t);
    execute format('create trigger %1$s_updated_at before update on public.%1$s for each row execute function public.mvl_set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Subscriptions & usage (written by the service role only)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  billing_interval text check (billing_interval in ('month', 'year')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.mvl_set_updated_at();

-- Monotonic counters: deleting a note does NOT give quota back.
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  notes_created integer not null default 0,
  voice_sessions integer not null default 0,
  primary key (user_id, period_start)
);

create or replace function public.effective_plan(p_user uuid)
returns text language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select s.plan from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ), 'free');
$$;

-- Single source of truth for plan limits. null = unlimited.
create or replace function public.plan_limits(p_plan text)
returns table (notes_per_month integer, voice_sessions_per_month integer)
language sql immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then null else 7 end,
         case p_plan when 'premium' then null else 60 end;
$$;

create or replace function public.enforce_note_quota()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_limit integer;
  v_used integer;
begin
  select l.notes_per_month into v_limit from public.plan_limits(public.effective_plan(new.user_id)) l;

  insert into public.usage_counters (user_id, period_start) values (new.user_id, v_period)
    on conflict (user_id, period_start) do nothing;

  select notes_created into v_used from public.usage_counters
    where user_id = new.user_id and period_start = v_period
    for update;

  if v_limit is not null and v_used >= v_limit then
    raise exception 'FREE_PLAN_NOTE_LIMIT: % notes per month on the free plan', v_limit
      using errcode = 'P0001';
  end if;

  update public.usage_counters set notes_created = notes_created + 1
    where user_id = new.user_id and period_start = v_period;
  return new;
end;
$$;
drop trigger if exists notes_enforce_quota on public.notes;
create trigger notes_enforce_quota before insert on public.notes
  for each row execute function public.enforce_note_quota();

-- ---------------------------------------------------------------------
-- New-user bootstrap: profile, default categories, free plan
-- ---------------------------------------------------------------------
create or replace function public.mvl_handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.categories (user_id, name, color, is_default)
  select new.id, c.name, c.color, true
  from (values
    ('School', '#2563eb'), ('Work', '#0f766e'), ('Personal', '#7c3aed'),
    ('Family', '#db2777'), ('Projects', '#ea580c'), ('Ideas', '#ca8a04'),
    ('Business', '#334155')
  ) as c(name, color)
  on conflict do nothing;
  return new;
end;
$$;
-- Named to sort AFTER the common template trigger "on_auth_user_created": Postgres fires
-- same-event triggers alphabetically, so a legacy trigger that inserts the profile without
-- ON CONFLICT runs first and this one (ON CONFLICT DO NOTHING) cannot make sign-up fail.
drop trigger if exists on_auth_user_created_zz_mvl on auth.users;
create trigger on_auth_user_created_zz_mvl after insert on auth.users
  for each row execute function public.mvl_handle_new_user();

-- Backfill for users that existed before this migration (e.g. FitPick accounts).
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
insert into public.subscriptions (user_id) select id from auth.users on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- Personal memory search (keyword, multilingual-safe 'simple' config).
-- SECURITY INVOKER: RLS on the underlying tables applies.
-- ---------------------------------------------------------------------
create or replace function public.search_memory(q text, max_results integer default 30)
returns table (
  record_type text, id uuid, title text, snippet text,
  occurred_at timestamptz, created_at timestamptz, rank real
)
language sql stable security invoker
set search_path = ''
as $$
  with query as (
    select websearch_to_tsquery('simple', q) as tsq,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select * from (
    select 'note'::text, n.id, coalesce(n.title, left(n.body, 80)), left(n.body, 240),
           n.created_at, n.created_at, ts_rank(n.search, query.tsq)
      from public.notes n, query
     where n.search @@ query.tsq or n.body ilike query.pattern or n.title ilike query.pattern
    union all
    select 'task', t.id, t.title, t.details, coalesce(t.due_at, t.due_date::timestamptz), t.created_at, ts_rank(t.search, query.tsq)
      from public.tasks t, query
     where t.search @@ query.tsq or t.title ilike query.pattern
    union all
    select 'reminder', r.id, r.title, r.notes, r.remind_at, r.created_at, ts_rank(r.search, query.tsq)
      from public.reminders r, query
     where r.search @@ query.tsq or r.title ilike query.pattern
    union all
    select 'event', e.id, e.title, e.notes, e.starts_at, e.created_at, ts_rank(e.search, query.tsq)
      from public.events e, query
     where e.search @@ query.tsq or e.title ilike query.pattern
  ) results (record_type, id, title, snippet, occurred_at, created_at, rank)
  where char_length(btrim(q)) between 1 and 200
  order by rank desc, created_at desc
  limit least(greatest(max_results, 1), 100);
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

-- Replace any pre-existing (unreviewed) policies on profiles.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "profiles: owner can read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner can update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No insert/delete policy: rows are created by the auth trigger and removed by cascade.

-- Column-level protection: users may only update preference columns.
-- (Also neutralises legacy FitPick columns such as is_pro, which a client could previously set.)
revoke update on public.profiles from anon, authenticated;
grant update (display_name, ui_language, speech_language, timezone, daily_briefing_enabled)
  on public.profiles to authenticated;

do $$
declare t text;
begin
  foreach t in array array['categories', 'voice_sessions', 'notes', 'tasks', 'reminders', 'events'] loop
    execute format('drop policy if exists "%1$s: owner can read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: owner can insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: owner can update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: owner can delete" on public.%1$s', t);
    execute format('create policy "%1$s: owner can read" on public.%1$s for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: owner can insert" on public.%1$s for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: owner can update" on public.%1$s for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: owner can delete" on public.%1$s for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%1$s from anon', t);
  end loop;
end $$;

-- Read-only for the owner; writes happen via the service role (billing webhooks / triggers).
drop policy if exists "subscriptions: owner can read" on public.subscriptions;
create policy "subscriptions: owner can read" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "usage: owner can read" on public.usage_counters;
create policy "usage: owner can read" on public.usage_counters
  for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.subscriptions, public.usage_counters from anon, authenticated;
revoke all on public.profiles, public.subscriptions, public.usage_counters from anon;

-- Functions: only signed-in users may call the public RPCs.
revoke execute on function public.search_memory(text, integer) from public, anon;
grant execute on function public.search_memory(text, integer) to authenticated;
revoke execute on function public.effective_plan(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_note_quota() from public, anon, authenticated;
revoke execute on function public.mvl_handle_new_user() from public, anon, authenticated;
