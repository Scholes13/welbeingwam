-- Add custom Strava credentials columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strava_client_id TEXT,
ADD COLUMN IF NOT EXISTS strava_client_secret TEXT;

-- Security Note: In a production app, client_secret should be encrypted.
-- For this MVP/Demo, we store as text to simplify the "BYOK" logic.
