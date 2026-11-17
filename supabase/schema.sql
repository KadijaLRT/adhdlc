-- profiles table: only used once optional auth/sign-in is added later.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  timezone text,
  energy_baseline text check (energy_baseline in ('low', 'medium', 'high')),
  stress_threshold text check (stress_threshold in ('low', 'medium', 'high')),
  biggest_hurdle text,
  -- Full profile object (all onboarding answers — modules, symptoms,
  -- fitness/nutrition preferences, etc.), not just the four fields
  -- above. Added so a device restore can bring back the whole profile,
  -- not just enough to skip onboarding with everything else blank.
  profile_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe to run again on an existing table — only adds the column if it's not already there.
alter table public.profiles add column if not exists profile_data jsonb;

alter table public.profiles enable row level security;

create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = user_id);

-- In-app account deletion (required by App Store Review Guideline 5.1.1(v)
-- for any app that lets people create an account, like the optional
-- email cloud backup). Lets a signed-in person delete ONLY their own
-- account; their profiles row is removed by the "on delete cascade" above.
-- Run this once in Supabase > SQL Editor.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
