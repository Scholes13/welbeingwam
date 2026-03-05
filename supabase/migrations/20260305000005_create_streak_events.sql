-- Streak events (admin-managed)
CREATE TABLE IF NOT EXISTS public.streak_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dimension_id UUID REFERENCES public.dimensions(id),
    multiplier_tiers JSONB NOT NULL DEFAULT '[
        {"days": 3, "multiplier": 1.25},
        {"days": 7, "multiplier": 1.5},
        {"days": 14, "multiplier": 1.75},
        {"days": 30, "multiplier": 2.0}
    ]'::jsonb,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    streak_event_id UUID REFERENCES public.streak_events(id) ON DELETE CASCADE NOT NULL,
    dimension_id UUID REFERENCES public.dimensions(id) NOT NULL,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_completed_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, streak_event_id, dimension_id)
);

-- RLS
ALTER TABLE public.streak_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read streak_events"
    ON public.streak_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access streak_events"
    ON public.streak_events FOR ALL TO service_role USING (true);

CREATE POLICY "Users can read own streaks"
    ON public.user_streaks FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow service role full access user_streaks"
    ON public.user_streaks FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streak_events_active ON public.streak_events(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id, streak_event_id);
