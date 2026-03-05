-- Migration: Enable Mixed Survey Types & Seed Wellbeing Experience
-- Goal: Update schema to support Text/Image inputs and seed the new survey.

-- 1. Schema Updates
ALTER TABLE public.survey_questions 
ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'choice'; -- 'choice', 'text', 'textarea', 'image', 'rating'

ALTER TABLE public.survey_answers 
ALTER COLUMN selected_option_index DROP NOT NULL;

ALTER TABLE public.survey_answers 
ADD COLUMN IF NOT EXISTS response_text text;

-- 2. Seed Survey: "Wellbeing Experience"
DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- Check if survey exists, if not create
    -- Check if survey exists, if not create
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Wellbeing Experience' LIMIT 1;

    IF v_survey_id IS NOT NULL THEN
        UPDATE surveys SET is_active = true, description = 'Share your wellness journey with us.' WHERE id = v_survey_id;
    ELSE
        INSERT INTO surveys (title, description, is_active)
        VALUES ('Wellbeing Experience', 'Share your wellness journey with us.', true)
        RETURNING id INTO v_survey_id;
    END IF;

    -- Clear existing questions for this survey to ensure clean state
    DELETE FROM survey_questions WHERE survey_id = v_survey_id;

    -- Insert Questions
    
    -- Q1: Wellness Type (Selection)
    INSERT INTO survey_questions (survey_id, order_index, question_text, question_type, options)
    VALUES (v_survey_id, 1, 'Wellness Type', 'choice', '[
        {"label": "Wellness - Culture"},
        {"label": "Wellness - Sport"},
        {"label": "Wellness - Healer"},
        {"label": "Wellness - Spa"},
        {"label": "Wellness - Nature"}
    ]'::jsonb);

    -- Q2: Store Name (Text Input)
    INSERT INTO survey_questions (survey_id, order_index, question_text, question_type, options)
    VALUES (v_survey_id, 2, 'Nama Tempat / Store Name', 'text', '[]'::jsonb);

    -- Q3: Experience (Text Area)
    INSERT INTO survey_questions (survey_id, order_index, question_text, question_type, options)
    VALUES (v_survey_id, 3, 'Ceritakan Pengalaman Anda', 'textarea', '[]'::jsonb);

    -- Q4: Photo (Image Upload)
    INSERT INTO survey_questions (survey_id, order_index, question_text, question_type, options)
    VALUES (v_survey_id, 4, 'Upload Foto', 'image', '[]'::jsonb);

END $$;
