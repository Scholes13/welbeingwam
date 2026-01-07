-- Fix Yogabarn Survey Issues

DO $$ 
DECLARE
    target_survey_id UUID := '2332d554-aa5b-4eb5-8409-0a5183a25151';
    yogabarn_rec_id UUID;
BEGIN
    -- 1. Fix Duplicate Questions
    -- Delete duplications keeping the one with the lowest ID (created first)
    DELETE FROM survey_questions 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (partition BY question_text, survey_id ORDER BY id) AS rnum 
            FROM survey_questions 
            WHERE survey_id = target_survey_id
        ) t 
        WHERE t.rnum > 1
    );

    -- 2. Activate Survey
    UPDATE surveys 
    SET is_active = true 
    WHERE id = target_survey_id;

END $$;
