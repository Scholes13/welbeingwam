-- Drop the unique constraint that prevents multiple claims of the same reward
ALTER TABLE user_rewards DROP CONSTRAINT IF EXISTS user_rewards_user_id_reward_id_key;

-- Ensure there is a non-unique index for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_reward ON user_rewards(user_id, reward_id);
