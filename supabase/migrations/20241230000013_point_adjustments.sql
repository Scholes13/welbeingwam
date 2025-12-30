-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set admin_wam as admin
UPDATE public.profiles SET is_admin = true WHERE username = 'admin_wam';

-- Create Point Adjustments Table
CREATE TABLE IF NOT EXISTS public.point_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    admin_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Point Adjustments (Default deny for client)
ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, error
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Notifications (Default deny for client)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_point_adjustments_user_id ON public.point_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Grant permissions (Service role has bypass, so these are mostly for potential future use or cleanliness)
GRANT ALL ON public.point_adjustments TO postgres, service_role;
GRANT ALL ON public.notifications TO postgres, service_role;

-- Force Schema Refresh
NOTIFY pgrst, 'reload config';
