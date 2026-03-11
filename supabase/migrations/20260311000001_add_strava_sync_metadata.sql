ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_strava_sync_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS sport_type TEXT,
ADD COLUMN IF NOT EXISTS has_calories BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

UPDATE public.activities
SET
  external_id = COALESCE(external_id, id::text),
  sport_type = COALESCE(sport_type, type),
  has_calories = COALESCE(has_calories, FALSE) OR COALESCE(calories, 0) > 0
WHERE source = 'strava';

CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_strava_external_id
ON public.activities(source, external_id)
WHERE source = 'strava' AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_strava_sync_at
ON public.profiles(last_strava_sync_at);

CREATE INDEX IF NOT EXISTS idx_activities_last_synced_at
ON public.activities(last_synced_at);
