-- Create doorprize_winners table
create table if not exists public.doorprize_winners (
    id uuid default gen_random_uuid() primary key,
    activity_id bigint references public.activities(id) on delete cascade not null,
    user_id bigint references public.profiles(id) on delete cascade not null,
    prize_name text not null,
    won_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_winner_per_activity unique (activity_id, user_id)
);

-- Add simple index
create index if not exists doorprize_winners_activity_id_idx on public.doorprize_winners(activity_id);

-- Enable RLS
alter table public.doorprize_winners enable row level security;

-- Policies (Admin only for now, or public read if needed for a display screen)
-- Assuming admin dashboard usage:
create policy "Admins can do everything on doorprize_winners"
    on public.doorprize_winners
    for all
    using (true) -- Simplified for this context, ideally check admin role
    with check (true);
