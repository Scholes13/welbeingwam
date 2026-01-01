-- Migration: Tuning Scoring Logic
-- Problem: Active classes (Water Dance) winning for "Stillness" users because of high "Refresh" overlap.
-- Solution: 
-- 1. Remove 'refresh' score from Q8 "Meditation" option (Meditation is not about cardio refresh).
-- 2. Reduce 'peace' score on Active classes (Water Dance, Vinyasa) so they don't rank for "Relaxation".

DO $$
BEGIN
    -- 1. Q8 Update: Remove 'refresh' from "Keheningan & Meditasi"
    -- Old: {"peace": 8, "focus": 4, "joy": 4, "refresh": 3}
    -- New: {"peace": 10, "focus": 5, "joy": 4} (Removed Refresh, boosted Peace)
    UPDATE survey_questions 
    SET options = '[
        {"label": "Gerak Tubuh Aktif (Movement) - Yoga / Pilates", "impact": {"power": 4, "refresh": 4, "joy": 2}},
        {"label": "Keheningan & Meditasi (Non-Physical) - Duduk Diam", "impact": {"peace": 10, "focus": 5, "joy": 4}},
        {"label": "Kombinasi Seimbang (Mindful Movement) - Gerak Ringan", "impact": {"peace": 4, "refresh": 3}}
    ]'::jsonb
    WHERE order_index = 8;

    -- 2. Product Tag Updates (Strict Separation)
    
    -- Water Dance: It is Fun (Joy) but NOT Peaceful (Stillness).
    -- Old: {"joy": 10, "refresh": 7, "peace": 5}
    -- New: {"joy": 10, "refresh": 8, "peace": 1}
    UPDATE products SET weighted_tags = '{"joy": 10, "refresh": 8, "peace": 1}'::jsonb WHERE name = 'FLOW STATE: Water Dance';

    -- Vinyasa: High Energy, Low Peace.
    UPDATE products SET weighted_tags = '{"power": 10, "refresh": 8, "joy": 5, "peace": 1}'::jsonb WHERE name = 'Vinyasa Flow';
    
    -- Morning Flow: Some peace, but mostly refresh.
    UPDATE products SET weighted_tags = '{"refresh": 10, "power": 6, "joy": 6, "peace": 2}'::jsonb WHERE name = 'Morning Flow';

    -- Yin & Acupressure: Needs higher Peace to compete.
    -- Old: {"peace": 9, "refresh": 8, "power": 1}
    -- New: {"peace": 12, "refresh": 6} (Boost Peace to ensure it wins "Stillness")
    UPDATE products SET weighted_tags = '{"peace": 12, "refresh": 6}'::jsonb WHERE name = 'Yin & Acupressure Points';

END $$;
