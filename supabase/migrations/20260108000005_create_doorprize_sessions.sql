-- Create doorprizes table to store session configuration
create table if not exists public.doorprizes (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null, -- Internal name e.g. "Sesi 1"
    activity_id bigint references public.activities(id) on delete cascade not null,
    prize_name text not null default 'Doorprize',
    quantity integer not null default 1,
    background_url text
);

-- Navigate winners to link to specific doorprize session instead of just activity
-- We keep activity_id for broader context/constraints if needed, but doorprize_id is precise.
alter table public.doorprize_winners 
add column if not exists doorprize_id uuid references public.doorprizes(id) on delete cascade;

-- RLS Policies
alter table public.doorprizes enable row level security;

-- Drop existing policies first to avoid conflicts
drop policy if exists "Admins can do everything on doorprizes" on public.doorprizes;
drop policy if exists "Public can view doorprizes" on public.doorprizes;

-- Admin can do everything
create policy "Admins can do everything on doorprizes"
    on public.doorprizes
    for all
    using (true);

-- Public read access (for presentation page)
create policy "Public can view doorprizes"
    on public.doorprizes
    for select
    using (true);
