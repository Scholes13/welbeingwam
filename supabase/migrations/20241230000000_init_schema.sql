-- Create a table for profiles (optional, but good for linking extra info)
-- This table automatically updates when a user signs up if you use a trigger, 
-- but for now we'll just insert/update on login if we were using a custom flow.
-- For this simple version, we can rely on `auth.users` but usually we want a public profiles table.

create table public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Create a table for activities
create table public.activities (
  id bigint not null primary key, -- Strava Activity ID
  user_id uuid references auth.users not null,
  name text,
  distance float, -- in meters
  moving_time int, -- in seconds
  type text, -- Run, Walk, etc
  start_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.activities enable row level security;

-- Policies for activities
create policy "Activities are viewable by everyone."
  on public.activities for select
  using ( true );

create policy "Users can insert/update their own activities."
  on public.activities for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own activities."
  on public.activities for update
  using ( auth.uid() = user_id );
