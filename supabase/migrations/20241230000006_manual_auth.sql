-- Add Manual Auth columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- Create Index for fast lookup by access code
CREATE INDEX IF NOT EXISTS idx_profiles_access_code ON public.profiles(access_code);
