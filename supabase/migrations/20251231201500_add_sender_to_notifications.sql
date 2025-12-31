ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS sender_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for sender lookups (optional)
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
