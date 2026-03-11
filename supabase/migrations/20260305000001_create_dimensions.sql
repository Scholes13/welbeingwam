-- Create dimensions table for WLM 6-dimension wellness system
CREATE TABLE IF NOT EXISTS public.dimensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    award_title TEXT NOT NULL,
    icon TEXT,
    sort_order INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed 6 dimensions
INSERT INTO public.dimensions (name, display_name, award_title, icon, sort_order) VALUES
    ('physical', 'Body Upgrade Mode', 'Strong Mode Champion of The Month', 'activity', 1),
    ('emotional', 'No Drama Zone', 'Most Positive Energy of The Month', 'heart', 2),
    ('mental', 'Brain Gym', 'Brain Star of The Month', 'brain', 3),
    ('social', 'Good Energy Circle', 'Team Connector of The Month', 'users', 4),
    ('spiritual', 'Inner Reset', 'Silent Power of The Month', 'sparkles', 5),
    ('professional', 'Level Up Career', 'Ownership Champion of The Month', 'briefcase', 6);

-- Enable RLS
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read dimensions
CREATE POLICY "Allow authenticated read dimensions"
    ON public.dimensions FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access dimensions"
    ON public.dimensions FOR ALL
    TO service_role
    USING (true);
