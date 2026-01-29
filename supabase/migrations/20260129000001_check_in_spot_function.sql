-- Function to check if participant is within spot radius and process check-in
CREATE OR REPLACE FUNCTION check_in_spot(
  p_participant_id UUID,
  p_spot_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_photo_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_spot RECORD;
  v_distance DOUBLE PRECISION;
  v_session RECORD;
  v_existing_visit RECORD;
  v_base_points INTEGER;
  v_photo_bonus INTEGER;
  v_total_points INTEGER;
  v_visit_id UUID;
BEGIN
  -- Check active session
  SELECT * INTO v_session FROM tour_sessions 
  WHERE is_active = TRUE 
    AND NOW() BETWEEN start_time AND end_time
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'SESSION_INACTIVE',
        'message', 'Tour session is not active'
      )
    );
  END IF;

  -- Check for existing visit
  SELECT * INTO v_existing_visit FROM visits 
  WHERE participant_id = p_participant_id AND spot_id = p_spot_id;
  
  IF v_existing_visit IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'ALREADY_VISITED',
        'message', 'Already checked in at this spot',
        'visited_at', v_existing_visit.checked_in_at
      )
    );
  END IF;

  -- Get spot and calculate distance
  SELECT *, ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  ) as distance INTO v_spot
  FROM quest_spots 
  WHERE id = p_spot_id AND is_active = TRUE AND deleted_at IS NULL;
  
  IF v_spot IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'SPOT_NOT_FOUND',
        'message', 'Quest spot not found'
      )
    );
  END IF;

  v_distance := v_spot.distance;
  
  -- Check if within radius
  IF v_distance > v_spot.radius THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', jsonb_build_object(
        'code', 'OUT_OF_RANGE',
        'distance_meters', ROUND(v_distance),
        'required_radius', v_spot.radius,
        'message', 'You are ' || ROUND(v_distance) || 'm away. Get within ' || v_spot.radius || 'm to check in.'
      )
    );
  END IF;

  -- Get point settings
  SELECT (value::TEXT)::INTEGER INTO v_base_points FROM settings WHERE key = 'base_checkin_points';
  SELECT (value::TEXT)::INTEGER INTO v_photo_bonus FROM settings WHERE key = 'photo_bonus_points';
  
  v_base_points := COALESCE(v_base_points, 50);
  v_photo_bonus := COALESCE(v_photo_bonus, 50);
  
  -- Calculate total points
  v_total_points := v_base_points;
  IF p_photo_url IS NOT NULL THEN
    v_total_points := v_total_points + v_photo_bonus;
  END IF;

  -- Create visit record
  INSERT INTO visits (participant_id, spot_id, photo_url, points_earned)
  VALUES (p_participant_id, p_spot_id, p_photo_url, v_total_points)
  RETURNING id INTO v_visit_id;

  -- Update participant total points
  UPDATE participants 
  SET total_points = total_points + v_total_points,
      updated_at = NOW()
  WHERE id = p_participant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'visit_id', v_visit_id,
    'points_earned', v_total_points,
    'distance_meters', ROUND(v_distance)
  );
END;
$$ LANGUAGE plpgsql;
