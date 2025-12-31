-- QR Spots table - stores generated QR codes for mark spots
CREATE TABLE IF NOT EXISTS qr_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    max_claims INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT REFERENCES profiles(id)
);

-- Track which users have claimed which spots
CREATE TABLE IF NOT EXISTS user_spot_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
    spot_id UUID REFERENCES qr_spots(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_spots_code ON qr_spots(code);
CREATE INDEX IF NOT EXISTS idx_qr_spots_active ON qr_spots(is_active);
CREATE INDEX IF NOT EXISTS idx_user_spot_claims_user ON user_spot_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spot_claims_spot ON user_spot_claims(spot_id);
