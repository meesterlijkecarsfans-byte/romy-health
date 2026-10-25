-- Romy Health cloud sync + Garmin storage
-- Safe to re-run in Supabase > SQL Editor > New query > Run.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.garmin_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_date date not null,
  sleep_seconds integer,
  total_calories integer,
  active_calories integer,
  resting_heart_rate integer,
  hrv_last_night numeric,
  body_battery integer,
  steps integer,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, calendar_date)
);

create table if not exists public.garmin_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  start_time timestamptz,
  activity_type text,
  activity_name text,
  duration_seconds integer,
  distance_meters numeric,
  calories integer,
  average_hr numeric,
  max_hr numeric,
  average_speed_mps numeric,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

alter table public.user_state enable row level security;
alter table public.garmin_daily enable row level security;
alter table public.garmin_activities enable row level security;

revoke all on table public.user_state from anon, authenticated;
revoke all on table public.garmin_daily from anon, authenticated;
revoke all on table public.garmin_activities from anon, authenticated;

grant select, insert, update on table public.user_state to authenticated;
grant select, insert, update on table public.garmin_daily to authenticated;
grant select, insert, update on table public.garmin_activities to authenticated;

-- user_state policies
drop policy if exists "Users can read own Romy Health state" on public.user_state;
drop policy if exists "Users can insert own Romy Health state" on public.user_state;
drop policy if exists "Users can update own Romy Health state" on public.user_state;
create policy "Users can read own Romy Health state" on public.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own Romy Health state" on public.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own Romy Health state" on public.user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Garmin policies: the Edge Function runs with your normal signed-in user JWT.
drop policy if exists "Users can read own Garmin daily data" on public.garmin_daily;
drop policy if exists "Users can insert own Garmin daily data" on public.garmin_daily;
drop policy if exists "Users can update own Garmin daily data" on public.garmin_daily;
drop policy if exists "Users can read own Garmin activities" on public.garmin_activities;
drop policy if exists "Users can insert own Garmin activities" on public.garmin_activities;
drop policy if exists "Users can update own Garmin activities" on public.garmin_activities;

create policy "Users can read own Garmin daily data" on public.garmin_daily for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own Garmin daily data" on public.garmin_daily for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own Garmin daily data" on public.garmin_daily for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can read own Garmin activities" on public.garmin_activities for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own Garmin activities" on public.garmin_activities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own Garmin activities" on public.garmin_activities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists garmin_daily_user_date_idx on public.garmin_daily(user_id, calendar_date desc);
create index if not exists garmin_activities_user_start_idx on public.garmin_activities(user_id, start_time desc);
