-- Add type column to rewards table
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'reveal' CHECK (type IN ('reveal', 'progress', 'mystery'));

-- Update existing rewards to 'reveal' just in case
UPDATE rewards SET type = 'reveal' WHERE type IS NULL;
