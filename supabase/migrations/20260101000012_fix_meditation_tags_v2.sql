-- Migration: Strict Tag Mapping for Jan 8 Schedule (Verified)
-- Goal: Ensure "Stillness" (Meditation) and "Movement" (Yoga) never overlap incorrectly.
-- Key Logic: 
-- "Refresh" = Physical Movement/Opening (Posture, Hips, Flow).
-- "Peace" = Mental Calm/Stillness.
-- "Focus" = Mental Attention.
-- "Power" = Strength/Sweat.

DO $$
BEGIN
    -- 1. PURE MEDITATION (Refresh = 0, Power = 0)
    -- "Presence & Purification": Clearing energy body, affirmations. Pure mental.
    UPDATE products 
    SET weighted_tags = '{"peace": 10, "focus": 8, "joy": 8, "refresh": 0, "power": 0}'::jsonb
    WHERE name = 'Presence & Purification';

    -- "Loving Kindness": Emotional healing. Pure Heart/Mental.
    UPDATE products 
    SET weighted_tags = '{"peace": 10, "joy": 10, "focus": 6, "refresh": 0, "power": 0}'::jsonb
    WHERE name = 'Loving Kindness Meditation';

    -- "Beginners Meditation": Quiet mind, finding center. Pure Mental.
    UPDATE products 
    SET weighted_tags = '{"peace": 10, "focus": 10, "refresh": 0, "power": 0}'::jsonb
    WHERE name = 'Beginners Meditation';


    -- 2. YIN / GENTLE (High Peace, High Refresh - Physical Release)
    -- "Yin & Acupressure": Deep release, relaxation. Physical but Still.
    UPDATE products 
    SET weighted_tags = '{"peace": 9, "refresh": 8, "power": 1}'::jsonb
    WHERE name = 'Yin & Acupressure Points';

    -- "Hatha - Rise n' Shine": Waking up body.
    UPDATE products 
    SET weighted_tags = '{"refresh": 9, "peace": 6, "power": 3}'::jsonb
    WHERE name = 'Hatha - Rise n'' Shine';


    -- 3. STRONG / ACTIVE (High Power, High Refresh - Cardio/Sweat)
    -- "Strong Slow Flow": Strength, stability.
    UPDATE products 
    SET weighted_tags = '{"power": 10, "focus": 7, "refresh": 6, "peace": 2}'::jsonb
    WHERE name = 'Strong Slow Flow';

    -- "Vinyasa Flow": Cardio, sweat.
    UPDATE products 
    SET weighted_tags = '{"power": 10, "refresh": 9, "joy": 5, "peace": 1}'::jsonb
    WHERE name = 'Vinyasa Flow';
    
    -- "Water Dance": Play, aquatic movement.
    UPDATE products 
    SET weighted_tags = '{"joy": 10, "refresh": 9, "power": 4, "peace": 1}'::jsonb
    WHERE name = 'FLOW STATE: Water Dance';

END $$;
