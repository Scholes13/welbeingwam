alter table public.profiles 
add column if not exists gender text check (gender in ('male', 'female'));

-- Optional: Update existing users to have a default (e.g. based on avatar guess or just null)
-- We leave them null for now.
