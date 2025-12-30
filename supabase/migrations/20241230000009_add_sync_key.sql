-- Add Sync Key column to profiles for API integrations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sync_key UUID DEFAULT gen_random_uuid();

-- Create Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_sync_key ON public.profiles(sync_key);
