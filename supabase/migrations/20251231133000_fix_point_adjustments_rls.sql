-- Fix RLS policies for point_adjustments table
-- The issue is that RLS is enabled but no policies exist, causing silent failures

-- Option 1: Disable RLS entirely (simpler, since we always use service_role)
ALTER TABLE public.point_adjustments DISABLE ROW LEVEL SECURITY;

-- Option 2 (if keeping RLS): Create permissive policies
-- DROP POLICY IF EXISTS point_adjustments_insert_all ON public.point_adjustments;
-- CREATE POLICY point_adjustments_insert_all ON public.point_adjustments FOR INSERT WITH CHECK (true);
-- CREATE POLICY point_adjustments_select_all ON public.point_adjustments FOR SELECT USING (true);

-- Also fix notifications table just in case
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Force schema refresh
NOTIFY pgrst, 'reload config';
