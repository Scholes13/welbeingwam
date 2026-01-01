-- Migration: Map Internal Needs to Active Classes
-- Goal: Ensure Q9 (Inner Focus) recommends relevant "Movement" classes, not just Meditation.

DO $$
BEGIN
    -- 1. "Self Love & Emotional Release" (Joy/Peace)
    -- Target for Active User: KUNDALINI YOGA
    -- "Emotional release, energy work, chanting" -> High Joy (Emotion), High Peace (Energy).
    UPDATE products 
    SET weighted_tags = '{"power": 6, "joy": 9, "peace": 8, "refresh": 5}'::jsonb
    WHERE name = 'Kundalini Yoga';

    -- 2. "Energy & Chakra Cleansing" (Peace/Focus)
    -- Target for Active User: DIVINE AWAKENING QI MASTERY
    -- "Internal strength, spiritually opening" -> High Peace, High Focus.
    UPDATE products 
    SET weighted_tags = '{"power": 5, "peace": 9, "focus": 8, "refresh": 6}'::jsonb
    WHERE name = 'Divine Awakening Qi Mastery';

    -- 3. "Clear Mind & Clarity" (Focus)
    -- Target for Active User: HATHA - RISE N' SHINE
    -- "Waking up body, alignment, clarity" -> High Focus, High Refresh.
    UPDATE products 
    SET weighted_tags = '{"refresh": 9, "focus": 8, "peace": 5, "power": 4}'::jsonb
    WHERE name = 'Hatha - Rise n'' Shine';

    -- 4. "Just Movement" (Power/Refresh)
    -- Remapping Vinyasa to be the default "Physical" choice if no inner focus is needed.
    UPDATE products 
    SET weighted_tags = '{"power": 10, "refresh": 9, "joy": 6, "peace": 2}'::jsonb
    WHERE name = 'Vinyasa Flow';

END $$;
