alter table public.quests 
add column if not exists verification_type text default 'none';
