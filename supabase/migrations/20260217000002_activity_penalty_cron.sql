BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.finalize_overdue_activity_attendance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows integer := 0;
BEGIN
    WITH updated AS (
        UPDATE public.attendance a
        SET
            scan_out_at = act.end_at,
            attended_minutes = 0,
            attendance_ratio = 0.3,
            final_points = FLOOR(GREATEST(COALESCE(act.points, 0), 0) * 0.3)::int,
            state = 'completed_penalty',
            is_penalized = true,
            penalty_type = 'missing_scan_out',
            penalty_percent = 30,
            updated_at = timezone('utc'::text, now())
        FROM public.admin_activities act
        WHERE a.activity_id = act.id
          AND COALESCE(a.state, 'in_progress') = 'in_progress'
          AND a.scan_in_at IS NOT NULL
          AND a.scan_out_at IS NULL
          AND timezone('utc'::text, now()) > act.end_at + make_interval(mins => GREATEST(COALESCE(act.scan_grace_minutes, 30), 0))
        RETURNING
            a.id,
            a.user_id,
            a.activity_id,
            a.points_awarded_at,
            FLOOR(GREATEST(COALESCE(act.points, 0), 0) * 0.3)::int AS awarded_points,
            act.title
    ),
    awarded_points AS (
        INSERT INTO public.point_adjustments (user_id, points, reason)
        SELECT
            u.user_id,
            u.awarded_points,
            FORMAT('Activity Attendance [%s]: %s (penalty 30%%)', u.id, u.title)
        FROM updated u
        WHERE u.points_awarded_at IS NULL
          AND u.awarded_points > 0
    ),
    awarded_notifications AS (
        INSERT INTO public.notifications (user_id, title, message, is_read)
        SELECT
            u.user_id,
            'Activity Points Awarded',
            FORMAT('You earned %s points for %s (penalty 30%%).', u.awarded_points, u.title),
            false
        FROM updated u
        WHERE u.points_awarded_at IS NULL
          AND u.awarded_points > 0
    ),
    marked_awarded AS (
        UPDATE public.attendance a
        SET
            points_awarded_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        FROM updated u
        WHERE a.id = u.id
          AND u.points_awarded_at IS NULL
    ),
    logs AS (
        INSERT INTO public.activity_scan_logs (activity_id, user_id, scan_type, result, reason)
        SELECT
            u.activity_id,
            u.user_id,
            'out',
            'success',
            'Auto penalty applied after grace period by pg_cron'
        FROM updated u
    )
    SELECT COUNT(*) INTO affected_rows FROM updated;

    RETURN COALESCE(affected_rows, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_overdue_activity_attendance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_overdue_activity_attendance() TO service_role;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = 'activity-finalize-overdue-attendance'
    ) THEN
        PERFORM cron.unschedule('activity-finalize-overdue-attendance');
    END IF;
END
$$;

SELECT cron.schedule(
    'activity-finalize-overdue-attendance',
    '*/5 * * * *',
    $$SELECT public.finalize_overdue_activity_attendance();$$
);

COMMIT;
