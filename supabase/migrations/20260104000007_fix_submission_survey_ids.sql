-- Fix incorrect survey_id in submissions
-- This updates submissions to point to the correct survey based on the questions answered

UPDATE public.survey_submissions s
SET survey_id = sub.correct_survey_id
FROM (
    SELECT DISTINCT
        sa.submission_id,
        sq.survey_id AS correct_survey_id
    FROM public.survey_answers sa
    JOIN public.survey_questions sq ON sa.question_id = sq.id
) sub
WHERE s.id = sub.submission_id
  AND s.survey_id != sub.correct_survey_id;
