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

-- Seed 5 dimensions from Excel "JENIS WELLBEING"
INSERT INTO public.dimensions (name, display_name, award_title, icon, sort_order) VALUES
    ('physical', 'Physical Wellbeing', 'Strong Mode Champion of The Month', 'activity', 1),
    ('emotional', 'Emotional Wellbeing', 'Most Positive Energy of The Month', 'heart', 2),
    ('social', 'Social Wellbeing', 'Team Connector of The Month', 'users', 3),
    ('financial', 'Financial Wellbeing', 'Financial Wellness Champion of The Month', 'banknote', 4),
    ('spiritual', 'Spiritual Wellbeing', 'Silent Power of The Month', 'sparkles', 5)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    award_title = EXCLUDED.award_title,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

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
