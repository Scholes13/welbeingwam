-- Migration: Add Q7 "Movement Preference" for Granular Recommendation
-- Goal: Distinguish between "Strong Slow", "Pilates", "Vinyasa", and "Yin".

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- 1. Get Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- 2. Insert Q7 (Movement Preference)
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 7, 'Jika harus bergerak hari ini, gaya apa yang tubuh Anda inginkan?', '[
        {"label": "Kuat & Perlahan (Slow Burn - Power)", "impact": {"power": 5, "focus": 4}},
        {"label": "Fokus Otot Inti & Postur (Pilates - Core)", "impact": {"power": 4, "refresh": 4, "focus": 3}},
        {"label": "Dinamis & Mengalir (Vinyasa - Flow)", "impact": {"power": 4, "joy": 4, "refresh": 3}},
        {"label": "Diam & Menahan (Yin - Chill)", "impact": {"peace": 5, "refresh": 3}}
    ]');

END $$;
