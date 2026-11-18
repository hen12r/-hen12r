-- TEST ONLY. A plausible FitPick schema, inferred from services/supabaseService.ts on `main`
-- (profiles: id, email, is_pro, photos_used; outfits) plus the standard Supabase starter
-- template (handle_new_user / on_auth_user_created, permissive "public profiles" policy).
-- The real schema can only be confirmed with supabase/preflight/inspect_existing_schema.sql.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_pro boolean default false,
  photos_used integer default 0
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.outfits (id text primary key, name text, gender text, items jsonb, total_price numeric);
alter table public.outfits enable row level security;
create policy "Outfits are public" on public.outfits for select using (true);

insert into auth.users (id, email) values
  ('11111111-0000-0000-0000-000000000001', 'fitpick-pro@test'),
  ('22222222-0000-0000-0000-000000000002', 'fitpick-free@test');
update public.profiles set is_pro = true, photos_used = 2 where id = '11111111-0000-0000-0000-000000000001';
update public.profiles set photos_used = 1 where id = '22222222-0000-0000-0000-000000000002';
insert into public.outfits values
  ('m-cas-1', 'Essential Hoodie', 'MALE', '[{"name":"Hoodie","price":34.99}]', 34.99),
  ('f-wrk-1', 'Executive Mini', 'FEMALE', '[{"name":"Blazer","price":48.5}]', 48.50);

-- Snapshot for before/after comparison.
create table public._before as
  select 'profiles' as t, md5(string_agg(p::text, '|' order by id)) as h, count(*) as n from public.profiles p
  union all
  select 'outfits', md5(string_agg(o::text, '|' order by id)), count(*) from public.outfits o;
