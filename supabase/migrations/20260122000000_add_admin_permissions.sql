-- Add permissions column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Update admin_wam to have super admin permissions
UPDATE public.profiles 
SET permissions = '["*"]'::jsonb 
WHERE username = 'admin_wam';

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
