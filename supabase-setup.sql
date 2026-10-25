-- Romy Health cloud sync
-- Run this once in Supabase > SQL Editor > New query > Run.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Because automatic Data API grants were disabled when the project was created,
-- explicitly grant only the operations the signed-in app needs.
revoke all on table public.user_state from anon, authenticated;
grant select, insert, update on table public.user_state to authenticated;

-- Re-running this file stays safe.
drop policy if exists "Users can read own Romy Health state" on public.user_state;
drop policy if exists "Users can insert own Romy Health state" on public.user_state;
drop policy if exists "Users can update own Romy Health state" on public.user_state;

create policy "Users can read own Romy Health state"
on public.user_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own Romy Health state"
on public.user_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own Romy Health state"
on public.user_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
