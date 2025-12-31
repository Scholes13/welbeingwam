alter table public.quests 
add column if not exists expires_at timestamptz default null;
