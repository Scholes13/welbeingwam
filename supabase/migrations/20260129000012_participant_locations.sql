-- Table to track participant locations in real-time
CREATE TABLE IF NOT EXISTS participant_locations (
  participant_id UUID PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_participant_locations_location 
  ON participant_locations USING GIST(location);

-- Index for online status
CREATE INDEX IF NOT EXISTS idx_participant_locations_online 
  ON participant_locations(is_online, last_seen);

-- Function to get online participants with their locations
CREATE OR REPLACE FUNCTION get_online_participants()
RETURNS TABLE (
  participant_id UUID,
  name VARCHAR(100),
  profile_photo_url TEXT,
  total_points INTEGER,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as participant_id,
    p.name,
    p.profile_photo_url,
    p.total_points,
    ST_X(pl.location::geometry) as lng,
    ST_Y(pl.location::geometry) as lat,
    pl.last_seen
  FROM participant_locations pl
  JOIN participants p ON pl.participant_id = p.id
  WHERE pl.is_online = true
    AND pl.last_seen > NOW() - INTERVAL '5 minutes'
    AND pl.location IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_online_participants() TO authenticated;
GRANT EXECUTE ON FUNCTION get_online_participants() TO service_role;

-- Enable realtime for participant_locations
ALTER PUBLICATION supabase_realtime ADD TABLE participant_locations;
