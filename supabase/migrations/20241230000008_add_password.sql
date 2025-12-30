-- Add Password column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Update Admin User with a default password
UPDATE public.profiles 
SET password = 'admin' 
WHERE access_code = 'WAM-ADMIN';
