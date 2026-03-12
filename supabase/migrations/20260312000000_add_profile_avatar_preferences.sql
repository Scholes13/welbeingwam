ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS manual_avatar_url text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS strava_avatar_url text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_source text NOT NULL DEFAULT 'manual';

UPDATE public.profiles
SET manual_avatar_url = COALESCE(manual_avatar_url, avatar_url);

UPDATE public.profiles
SET avatar_source = 'manual'
WHERE avatar_source IS NULL OR avatar_source = '';
