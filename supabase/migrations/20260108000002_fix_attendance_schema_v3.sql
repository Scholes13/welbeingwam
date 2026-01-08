-- FIX V3: Align with Live DB Schema (BigInt)
-- The live database uses BIGINT for profiles.id, so attendance.user_id MUST be BIGINT.
-- This script fixes the Missing Foreign Key issue while respecting the existing types.

BEGIN;

-- 1. Create table with correct types (activity_id=UUID, user_id=BIGINT)
CREATE TABLE public.attendance_v3 (
    id uuid default gen_random_uuid() primary key,
    activity_id uuid references public.admin_activities(id) on delete cascade not null,
    user_id bigint references public.profiles(id) on delete cascade not null, -- MATCHES PROFILES.ID
    scanned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(activity_id, user_id)
);

-- 2. Migrate data
-- Assuming original attendance.user_id was ALREADY bigint (since scanning worked)
-- If it was somehow something else, we cast to bigint.
INSERT INTO public.attendance_v3 (id, activity_id, user_id, scanned_at)
SELECT 
    a.id, 
    a.activity_id, 
    a.user_id::bigint, 
    a.scanned_at
FROM public.attendance a;
-- We don't join profiles here to avoid losing data if profile is missing, 
-- but strictly if FK enforces it, it will fail if orphan exists.
-- Let's risk it (standard FK behavior). If it fails, we know we have orphans.

-- 3. Swap tables
DROP TABLE IF EXISTS public.attendance_new; -- Clean up failed V2 if it exists partially
DROP TABLE public.attendance;
ALTER TABLE public.attendance_v3 RENAME TO attendance;

-- 4. Policies
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Admin insert" ON public.attendance FOR INSERT WITH CHECK (true);

COMMIT;
