-- Create surveys table if not exists
create table if not exists public.surveys (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add survey_id to questions if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='survey_questions' AND column_name='survey_id') THEN
        ALTER TABLE public.survey_questions ADD COLUMN survey_id uuid references public.surveys(id) on delete cascade;
    END IF;
END $$;

-- Enable RLS
alter table public.surveys enable row level security;

-- Re-create policy to ensure it matches
drop policy if exists "Public read surveys" on public.surveys;
create policy "Public read surveys" on public.surveys for select using (true);

-- Seed a default survey ONLY if table is empty
DO $$
DECLARE
  default_survey_id uuid;
  count_surveys int;
BEGIN
  SELECT count(*) INTO count_surveys FROM public.surveys;
  
  IF count_surveys = 0 THEN
      INSERT INTO public.surveys (title, description) 
      VALUES ('Wellness Assessment', 'Discover your wellness score.')
      RETURNING id INTO default_survey_id;

      -- Link existing questions to this new survey (if any exist)
      UPDATE public.survey_questions 
      SET survey_id = default_survey_id 
      WHERE survey_id IS NULL;
  END IF;
END $$;
