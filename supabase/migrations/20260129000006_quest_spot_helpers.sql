-- Helper function to create quest spot with PostGIS point
CREATE OR REPLACE FUNCTION create_quest_spot(
  p_name VARCHAR,
  p_description TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius INTEGER,
  p_points INTEGER,
  p_category_id UUID
) RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  location GEOGRAPHY,
  radius INTEGER,
  points INTEGER,
  category_id UUID,
  is_active BOOLEAN,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO quest_spots (name, description, location, radius, points, category_id)
  VALUES (
    p_name,
    p_description,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_radius,
    p_points,
    p_category_id
  )
  RETURNING 
    quest_spots.id,
    quest_spots.name,
    quest_spots.description,
    quest_spots.location,
    quest_spots.radius,
    quest_spots.points,
    quest_spots.category_id,
    quest_spots.is_active,
    quest_spots.deleted_at,
    quest_spots.created_at,
    quest_spots.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get coordinates from a quest spot
CREATE OR REPLACE FUNCTION get_spot_coordinates(spot_id UUID)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location::geometry) as latitude,
    ST_X(location::geometry) as longitude
  FROM quest_spots
  WHERE id = spot_id;
END;
$$ LANGUAGE plpgsql;
