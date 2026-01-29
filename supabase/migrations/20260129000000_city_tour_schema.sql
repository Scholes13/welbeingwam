-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  profile_photo_url TEXT,
  total_points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon_url TEXT,
  color VARCHAR(7) DEFAULT '#FC4C02',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest spots table with PostGIS
CREATE TABLE quest_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius INTEGER NOT NULL CHECK (radius >= 20 AND radius <= 500),
  points INTEGER NOT NULL DEFAULT 50,
  category_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) NOT NULL,
  spot_id UUID REFERENCES quest_spots(id) NOT NULL,
  photo_url TEXT,
  points_earned INTEGER NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, spot_id)
);

-- Badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type VARCHAR(20) NOT NULL, -- 'category_streak', 'speed_demon', 'completion'
  category_id UUID REFERENCES categories(id), -- for category-specific badges
  bonus_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant badges (earned)
CREATE TABLE participant_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, badge_id)
);

-- Tour sessions table
CREATE TABLE tour_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (feature toggles & config)
CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_visits_participant ON visits(participant_id);
CREATE INDEX idx_visits_spot ON visits(spot_id);
CREATE INDEX idx_visits_checked_in_at ON visits(checked_in_at);
CREATE INDEX idx_quest_spots_location ON quest_spots USING GIST(location);
CREATE INDEX idx_quest_spots_category ON quest_spots(category_id);
CREATE INDEX idx_participants_points ON participants(total_points DESC);
