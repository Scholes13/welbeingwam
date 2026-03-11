ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'daily';

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS calories INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS activity_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS proof_url TEXT;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS review_reason TEXT;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

CREATE INDEX IF NOT EXISTS idx_activities_mode ON public.activities(mode);
CREATE INDEX IF NOT EXISTS idx_activities_review_status ON public.activities(review_status);
CREATE INDEX IF NOT EXISTS idx_activities_dimension_id ON public.activities(dimension_id);
