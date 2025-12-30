-- Add steps column to activities table
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS steps INTEGER DEFAULT 0;

-- Optional: Update existing rows if possible (or just leave 0)
-- We can't backfill accurately without re-fetching from Strava, so we leave 0.
