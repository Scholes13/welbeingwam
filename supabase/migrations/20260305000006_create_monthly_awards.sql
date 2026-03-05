CREATE TABLE IF NOT EXISTS public.monthly_awards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    dimension_id UUID REFERENCES public.dimensions(id) NOT NULL,
    period TEXT NOT NULL,
    award_title TEXT NOT NULL,
    points_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dimension_id, period)
);

ALTER TABLE public.monthly_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read monthly_awards"
    ON public.monthly_awards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access monthly_awards"
    ON public.monthly_awards FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_monthly_awards_user ON public.monthly_awards(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_awards_period ON public.monthly_awards(period);
