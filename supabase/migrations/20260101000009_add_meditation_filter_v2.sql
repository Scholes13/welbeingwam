-- Migration: Add Q8 "Method Preference" (Refined & Fixed)
-- Goal: Add the Meditation vs Movement choice with balanced scoring logic.

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Insert Q8 (Method Preference)
    -- clean JSON without comments inside the string
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 8, 'Apa jenis aktivitas yang Anda cari hari ini?', '[
        {"label": "Gerak Tubuh Aktif (Movement) - Yoga / Pilates", "impact": {"power": 3, "refresh": 3, "joy": 2}},
        {"label": "Keheningan & Meditasi (Non-Physical) - Duduk Diam", "impact": {"peace": 8, "focus": 4, "joy": 4, "refresh": 3}},
        {"label": "Kombinasi Seimbang (Mindful Movement) - Gerak Ringan", "impact": {"peace": 3, "refresh": 3}}
    ]');

    -- 3. Ensure "Beginners Meditation" is correctly tagged for the new logic
    UPDATE products 
    SET weighted_tags = '{"peace": 10, "focus": 9, "power": 0}'::jsonb
    WHERE name = 'Beginners Meditation';

END $$;
