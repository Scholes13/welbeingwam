-- Add bonus_claimed column to track if a positive message has already given bonus
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS bonus_claimed BOOLEAN DEFAULT FALSE;
