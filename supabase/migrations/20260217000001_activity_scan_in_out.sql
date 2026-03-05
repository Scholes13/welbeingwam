BEGIN;

CREATE TABLE IF NOT EXISTS public.activity_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.activity_types (name, description, is_active)
SELECT 'Internal Activity', 'Default company internal activity type', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_types WHERE name = 'Internal Activity'
);

ALTER TABLE public.admin_activities
    ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.activity_types(id),
    ADD COLUMN IF NOT EXISTS start_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS end_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS scan_grace_minutes integer NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS series_key text;

UPDATE public.admin_activities
SET start_at = (activity_date::text || 'T00:00:00Z')::timestamp with time zone
WHERE start_at IS NULL;

UPDATE public.admin_activities
SET end_at = start_at + interval '2 hours'
WHERE end_at IS NULL;

UPDATE public.admin_activities a
SET type_id = t.id
FROM public.activity_types t
WHERE t.name = 'Internal Activity'
  AND a.type_id IS NULL;

ALTER TABLE public.admin_activities
    ALTER COLUMN type_id SET NOT NULL,
    ALTER COLUMN start_at SET NOT NULL,
    ALTER COLUMN end_at SET NOT NULL;

ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS scan_in_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS scan_out_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS attended_minutes integer,
    ADD COLUMN IF NOT EXISTS attendance_ratio numeric(6,4),
    ADD COLUMN IF NOT EXISTS final_points integer,
    ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'in_progress',
    ADD COLUMN IF NOT EXISTS is_penalized boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS penalty_type text,
    ADD COLUMN IF NOT EXISTS penalty_percent integer,
    ADD COLUMN IF NOT EXISTS points_awarded_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

UPDATE public.attendance a
SET
    scan_in_at = COALESCE(a.scan_in_at, a.scanned_at),
    scan_out_at = COALESCE(a.scan_out_at, a.scanned_at),
    attended_minutes = COALESCE(a.attended_minutes, GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (act.end_at - act.start_at)) / 60)::int)),
    attendance_ratio = COALESCE(a.attendance_ratio, 1),
    final_points = COALESCE(a.final_points, act.points),
    state = CASE
        WHEN COALESCE(a.scan_out_at, a.scanned_at) IS NULL THEN 'in_progress'
        ELSE 'completed'
    END,
    points_awarded_at = COALESCE(a.points_awarded_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
FROM public.admin_activities act
WHERE act.id = a.activity_id;

CREATE INDEX IF NOT EXISTS idx_admin_activities_type_id ON public.admin_activities(type_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_start_at ON public.admin_activities(start_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_publish ON public.admin_activities(is_published);
CREATE INDEX IF NOT EXISTS idx_attendance_state ON public.attendance(state);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_out ON public.attendance(scan_out_at);

CREATE TABLE IF NOT EXISTS public.activity_scan_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id uuid REFERENCES public.admin_activities(id) ON DELETE CASCADE NOT NULL,
    user_id bigint REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    scan_type text NOT NULL,
    result text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_scan_logs_activity_id ON public.activity_scan_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_scan_logs_user_id ON public.activity_scan_logs(user_id);

COMMIT;
