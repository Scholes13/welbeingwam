-- Add is_reply column to distinguish Send vs Reply messages
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT FALSE;

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_notifications_is_reply ON notifications(is_reply);
