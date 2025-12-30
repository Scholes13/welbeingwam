-- Add points column to admin_activities
alter table public.admin_activities 
add column if not exists points integer default 0;
