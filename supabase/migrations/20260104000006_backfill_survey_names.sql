-- Backfill custom_name for existing survey submissions
-- This will populate names for past submissions that have user_id but no custom_name

UPDATE public.survey_submissions s
SET custom_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
)
FROM auth.users u
WHERE s.user_id = u.id
  AND s.custom_name IS NULL;
