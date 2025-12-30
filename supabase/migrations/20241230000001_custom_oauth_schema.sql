-- Drop previous tables if they exist to start fresh with new schema
drop table if exists public.activities;
drop table if exists public.profiles;

-- Create profiles table keyed by Strava ID
create table public.profiles (
  id bigint not null primary key, -- Strava Athlete ID
  username text,
  full_name text,
  avatar_url text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- Enable RLS
alter table public.profiles enable row level security;
-- Allow public read for leaderboard
create policy "Profiles are viewable by everyone." on public.profiles for select using ( true );
-- We will use Service Role for writes, so no specific insert policy needed for anon

-- Create activities table
create table public.activities (
  id bigint not null primary key, -- Strava Activity ID
  user_id bigint references public.profiles(id) not null,
  name text,
  distance float,
  moving_time int,
  type text,
  start_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.activities enable row level security;
create policy "Activities are viewable by everyone." on public.activities for select using ( true );
