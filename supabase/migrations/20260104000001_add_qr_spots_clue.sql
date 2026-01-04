-- Add clue column to qr_spots table
ALTER TABLE qr_spots ADD COLUMN IF NOT EXISTS clue TEXT;

-- Add comment for documentation
COMMENT ON COLUMN qr_spots.clue IS 'Hint text that helps users find this spot. Revealed via special reward.';
