-- Add card_background column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS card_background TEXT DEFAULT 'default';
