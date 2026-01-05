-- Fix Activity Feedback Survey options format (text -> label)
-- This migration updates existing data

UPDATE survey_questions sq
SET options = (
    SELECT jsonb_agg(
        CASE 
            WHEN (elem->>'label') IS NULL AND (elem->>'text') IS NOT NULL 
            THEN jsonb_build_object('label', elem->>'text', 'value', elem->>'value')
            ELSE elem
        END
    )
    FROM jsonb_array_elements(sq.options) elem
)
WHERE survey_id IN (SELECT id FROM surveys WHERE title = 'Activity Feedback Survey')
  AND options IS NOT NULL;
