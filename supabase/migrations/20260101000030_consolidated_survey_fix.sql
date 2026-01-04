-- Migration: Consolidated Survey Fix (v11-v19)
-- Goal: Apply all final survey refinements in one clean step.
-- 1. Strict Product Tagging (Meditation vs Movement).
-- 2. New Q7 (Activity Preference) - Merged & Sanitized.
-- 3. New Q8 (Internal Focus) - Needs based.

DO $$
DECLARE
    v_survey_id uuid;
BEGIN
    -- Get Survey ID
    SELECT id INTO v_survey_id FROM surveys WHERE title = 'Corporate Wellbeing' LIMIT 1;
    IF v_survey_id IS NULL THEN
        SELECT id INTO v_survey_id FROM surveys LIMIT 1;
    END IF;

    -- ==========================================
    -- 1. STRICT PRODUCT TAGGING (The Logic Fix)
    -- ==========================================
    
    -- PURE MEDITATION (Refresh = 0, Power = 0)
    UPDATE products SET weighted_tags = '{"peace": 10, "focus": 10, "refresh": 0, "power": 0}'::jsonb WHERE name = 'Beginners Meditation';
    UPDATE products SET weighted_tags = '{"peace": 10, "joy": 10, "focus": 6, "refresh": 0, "power": 0}'::jsonb WHERE name = 'Loving Kindness Meditation';
    UPDATE products SET weighted_tags = '{"peace": 10, "focus": 8, "joy": 8, "refresh": 0, "power": 0}'::jsonb WHERE name = 'Presence & Purification';

    -- YIN / GENTLE (High Refresh, High Peace)
    UPDATE products SET weighted_tags = '{"peace": 9, "refresh": 8, "power": 1}'::jsonb WHERE name = 'Yin & Acupressure Points';
    
    -- ACTIVE & INTERNAL (Needs Mapping)
    UPDATE products SET weighted_tags = '{"power": 6, "joy": 9, "peace": 8, "refresh": 5}'::jsonb WHERE name = 'Kundalini Yoga'; -- Self Love (Joy)
    UPDATE products SET weighted_tags = '{"power": 5, "peace": 9, "focus": 8, "refresh": 6}'::jsonb WHERE name = 'Divine Awakening Qi Mastery'; -- Energy (Peace)
    UPDATE products SET weighted_tags = '{"refresh": 9, "focus": 8, "peace": 5, "power": 4}'::jsonb WHERE name = 'Hatha - Rise n'' Shine'; -- Clarity (Focus)

    -- ACTIVE / PHYSICAL (Low Peace)
    UPDATE products SET weighted_tags = '{"power": 10, "refresh": 9, "joy": 5, "peace": 1}'::jsonb WHERE name = 'Vinyasa Flow';
    UPDATE products SET weighted_tags = '{"joy": 10, "refresh": 9, "power": 4, "peace": 1}'::jsonb WHERE name = 'FLOW STATE: Water Dance';
    UPDATE products SET weighted_tags = '{"power": 10, "focus": 7, "refresh": 6, "peace": 2}'::jsonb WHERE name = 'Strong Slow Flow';
    UPDATE products SET weighted_tags = '{"refresh": 10, "power": 6, "joy": 6, "peace": 2}'::jsonb WHERE name = 'Morning Flow';


    -- ==========================================
    -- 2. SURVEY QUESTIONS UPDATE
    -- ==========================================

    -- Q7: Main Activity Preference (Merged Style + Method)
    -- No Product Names. No "Diam".
    UPDATE survey_questions 
    SET 
        question_text = 'Bagaimana bentuk aktivitas yang tubuh Anda butuhkan hari ini?',
        options = '[
            {"label": "Gerak Dinamis & Membakar Kalori (Cardio)", "impact": {"power": 5, "joy": 4, "refresh": 4}},
            {"label": "Penguatan Otot & Postur Tubuh (Strength)", "impact": {"power": 5, "refresh": 4, "focus": 3}},
            {"label": "Peregangan Mendalam & Relaksasi Fisik (Deep Stretch)", "impact": {"peace": 4, "refresh": 5, "power": 1}},
            {"label": "Ketenangan Pikiran & Batin (Mindfulness)", "impact": {"peace": 10, "focus": 5, "joy": 5}}
        ]'::jsonb
    WHERE order_index = 7 AND survey_id = v_survey_id;

    -- DELETE Old Q8 (if it exists from previous state)
    DELETE FROM survey_questions WHERE order_index = 8 AND survey_id = v_survey_id;

    -- Q8: Internal Focus (Was Q9, Renumbered & Neutralized)
    -- Insert it at index 8. If Q9 existed, we move it to 8. If Q8 didn''t exist, we insert new.
    -- Safest strategy: Delete 8 and 9, then Insert new 8.
    
    DELETE FROM survey_questions WHERE order_index = 9 AND survey_id = v_survey_id;
    
    INSERT INTO survey_questions (survey_id, order_index, question_text, options) VALUES
    (v_survey_id, 8, 'Jika Anda bisa meminta satu perasaan untuk dibawa pulang, itu adalah...', '[
        {"label": "Rasa Tenang & Teratur (Clarifying)", "impact": {"focus": 5, "peace": 3}},
        {"label": "Rasa Diterima & Disayang (Embracing)", "impact": {"joy": 5, "peace": 3}},
        {"label": "Rasa Ringan & Lepas (Releasing)", "impact": {"peace": 4, "focus": 4}},
        {"label": "Rasa Segar & Kuat (Energizing)", "impact": {"power": 3, "refresh": 3}}
    ]');

END $$;
