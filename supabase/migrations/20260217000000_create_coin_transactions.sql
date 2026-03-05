-- Create coin_transactions table to separate coin adjustments from point adjustments
-- This allows COIN RESET and similar operations to affect availableCoins without affecting leaderboard/overall_points

CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,  -- positive = add coins, negative = deduct coins
    reason TEXT NOT NULL,
    admin_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);

-- Enable RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own coin transactions
CREATE POLICY "Users can view own coin transactions" ON coin_transactions
    FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE id = user_id));

-- Policy: Only service role can insert (via backend)
CREATE POLICY "Service role can insert coin transactions" ON coin_transactions
    FOR INSERT WITH CHECK (true);

-- Policy: Only service role can delete
CREATE POLICY "Service role can delete coin transactions" ON coin_transactions
    FOR DELETE USING (true);

COMMENT ON TABLE coin_transactions IS 'Tracks coin balance changes separately from points. Used for COIN RESET, admin adjustments, etc.';
COMMENT ON COLUMN coin_transactions.amount IS 'Positive adds coins, negative deducts coins';
