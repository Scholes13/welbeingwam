-- Create function to get active quest spots with coordinates extracted from PostGIS geography
-- This is needed because Supabase returns geography as binary (WKB) by default

CREATE OR REPLACE FUNCTION get_active_spots_with_coordinates()
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  radius INTEGER,
  points INTEGER,
  category_id UUID,
  category_name VARCHAR(50),
  category_icon TEXT,
  category_color VARCHAR(7)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qs.id,
    qs.name,
    qs.description,
    ST_X(qs.location::geometry) as lng,
    ST_Y(qs.location::geometry) as lat,
    qs.radius,
    qs.points,
    qs.category_id,
    c.name as category_name,
    c.icon_url as category_icon,
    c.color as category_color
  FROM quest_spots qs
  LEFT JOIN categories c ON qs.category_id = c.id
  WHERE qs.is_active = true
    AND qs.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_active_spots_with_coordinates() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_spots_with_coordinates() TO service_role;
