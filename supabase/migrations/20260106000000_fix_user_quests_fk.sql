-- Ensure user_quests has foreign keys for joins to work
DO $$ 
BEGIN 
    -- User ID FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_quests_user_id_fkey') THEN
        ALTER TABLE user_quests
        ADD CONSTRAINT user_quests_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;

    -- Quest ID FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_quests_quest_id_fkey') THEN
        ALTER TABLE user_quests
        ADD CONSTRAINT user_quests_quest_id_fkey
        FOREIGN KEY (quest_id)
        REFERENCES quests(id)
        ON DELETE CASCADE;
    END IF;
END $$;
