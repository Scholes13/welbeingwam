-- Create products table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text,
  affiliate_link text,
  tags text[], -- e.g. ['sleep', 'energy']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create questions table
create table public.survey_questions (
  id uuid default gen_random_uuid() primary key,
  question_text text not null,
  order_index int not null, -- 1, 2, 3...
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create options table
create table public.survey_options (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.survey_questions(id) not null,
  label text not null, -- "I sleep poorly"
  value text not null, -- "poor_sleep" (used for logic)
  recommended_tags text[], -- e.g. ['sleep'] - if selected, boost 'sleep' score
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create responses table
create table public.user_responses (
  id uuid default gen_random_uuid() primary key,
  user_id bigint references public.profiles(id), -- Optional: can be anon
  session_id uuid, -- For tracking anon users if needed
  question_id uuid references public.survey_questions(id) not null,
  option_id uuid references public.survey_options(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.products enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_options enable row level security;
alter table public.user_responses enable row level security;

-- Policies (Public Read for content, Insert for responses)
create policy "Public read products" on public.products for select using (true);
create policy "Public read questions" on public.survey_questions for select using (true);
create policy "Public read options" on public.survey_options for select using (true);
create policy "Public insert responses" on public.user_responses for insert with check (true);

-- SEED DATA (Demo)
INSERT INTO public.products (name, description, image_url, tags) VALUES
('Magnesium Glycinate', 'Best for deep sleep and recovery.', 'https://placehold.co/400x400/1e1e1e/FFF?text=Magnesium', ARRAY['sleep', 'recovery']),
('Matcha Energy', 'Clean energy without the crash.', 'https://placehold.co/400x400/2ecc71/FFF?text=Matcha', ARRAY['energy', 'focus']),
('Whey Protein Isolate', 'Essential for muscle repair.', 'https://placehold.co/400x400/e74c3c/FFF?text=Whey', ARRAY['muscle', 'recovery']);

INSERT INTO public.survey_questions (question_text, order_index) VALUES
('What is your primary wellness goal?', 1),
('How is your sleep quality?', 2),
('Do you often feel afternoon slump?', 3);

-- (Note: In a real migration, we'd look up IDs to insert options, 
-- but for simplicity in this file, we assume the user might manually enter data 
-- or we use a seed script. Since SQL usually needs known IDs for Foreign Keys, 
-- I will leave the options empty for now or use a do block if supported by Supabase Editor 
-- but standard SQL is safer).
