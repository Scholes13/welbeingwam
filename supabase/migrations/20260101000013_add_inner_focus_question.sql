-- Migration: Add Q9 "Internal Focus" (Batin)
-- Goal: Pinpoint "Loving Kindness" (Self-Love) vs "Beginners" (Clear Mind) usage.

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Insert Q9 (Internal Focus)
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 9, 'Apa yang sedang paling Anda butuhkan secara batin?', '[
        {"label": "Kejernihan & Ketenangan Pikiran (Clear Mind)", "impact": {"focus": 5, "peace": 3}},
        -- Targets Beginners Meditation

        {"label": "Kasih Sayang & Penerimaan Diri (Self Love)", "impact": {"joy": 5, "peace": 3}},
        -- Targets Loving Kindness (which has high Joy)

        {"label": "Pembersihan Energi & Chakra (Energy)", "impact": {"peace": 4, "focus": 4}},
        -- Targets Presence & Purification

        {"label": "Saya hanya ingin bergerak (Physical Only)", "impact": {"power": 3, "refresh": 3}}
        -- Neutral for those who ignored Q8
    ]');

END $$;
