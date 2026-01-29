-- Function to evaluate and award badges after check-in
CREATE OR REPLACE FUNCTION evaluate_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_id UUID;
  v_session_start TIMESTAMPTZ;
  v_category_id UUID;
  v_streak_count INTEGER;
  v_first_hour_count INTEGER;
  v_total_spots INTEGER;
  v_visited_spots INTEGER;
  v_badge RECORD;
  v_badges_enabled BOOLEAN;
  v_streak_bonus INTEGER;
  v_speed_bonus INTEGER;
BEGIN
  -- Check if badges feature is enabled
  SELECT (value::TEXT)::BOOLEAN INTO v_badges_enabled 
  FROM settings WHERE key = 'feature_badges';
  
  IF NOT COALESCE(v_badges_enabled, TRUE) THEN
    RETURN NEW;
  END IF;

  v_participant_id := NEW.participant_id;
  
  -- Get bonus point values
  SELECT (value::TEXT)::INTEGER INTO v_streak_bonus FROM settings WHERE key = 'category_streak_bonus';
  SELECT (value::TEXT)::INTEGER INTO v_speed_bonus FROM settings WHERE key = 'speed_demon_bonus';
  v_streak_bonus := COALESCE(v_streak_bonus, 200);
  v_speed_bonus := COALESCE(v_speed_bonus, 300);

  -- Check Category Streak (5 consecutive same category)
  WITH recent_visits AS (
    SELECT v.id, qs.category_id,
           ROW_NUMBER() OVER (ORDER BY v.checked_in_at DESC) as rn
    FROM visits v
    JOIN quest_spots qs ON v.spot_id = qs.id
    WHERE v.participant_id = v_participant_id
    ORDER BY v.checked_in_at DESC
    LIMIT 5
  )
  SELECT category_id, COUNT(*) INTO v_category_id, v_streak_count
  FROM recent_visits
  GROUP BY category_id
  HAVING COUNT(*) = 5;

  IF v_streak_count = 5 AND v_category_id IS NOT NULL THEN
    -- Find category-specific badge
    SELECT * INTO v_badge FROM badges 
    WHERE badge_type = 'category_streak' AND category_id = v_category_id;
    
    IF v_badge IS NOT NULL THEN
      -- Award badge if not already earned
      INSERT INTO participant_badges (participant_id, badge_id)
      VALUES (v_participant_id, v_badge.id)
      ON CONFLICT (participant_id, badge_id) DO NOTHING;
      
      -- Award bonus points if badge was newly inserted
      IF FOUND THEN
        UPDATE participants 
        SET total_points = total_points + v_streak_bonus
        WHERE id = v_participant_id;
      END IF;
    END IF;
  END IF;

  -- Check Speed Demon (10 spots in first hour)
  SELECT start_time INTO v_session_start FROM tour_sessions 
  WHERE is_active = TRUE LIMIT 1;
  
  IF v_session_start IS NOT NULL THEN
    SELECT COUNT(*) INTO v_first_hour_count
    FROM visits
    WHERE participant_id = v_participant_id
      AND checked_in_at <= v_session_start + INTERVAL '1 hour';
    
    IF v_first_hour_count >= 10 THEN
      SELECT * INTO v_badge FROM badges WHERE badge_type = 'speed_demon';
      
      IF v_badge IS NOT NULL THEN
        INSERT INTO participant_badges (participant_id, badge_id)
        VALUES (v_participant_id, v_badge.id)
        ON CONFLICT (participant_id, badge_id) DO NOTHING;
        
        IF FOUND THEN
          UPDATE participants 
          SET total_points = total_points + v_speed_bonus
          WHERE id = v_participant_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check Completion Badge (all spots visited)
  SELECT COUNT(*) INTO v_total_spots FROM quest_spots 
  WHERE is_active = TRUE AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_visited_spots FROM visits 
  WHERE participant_id = v_participant_id;
  
  IF v_visited_spots = v_total_spots AND v_total_spots > 0 THEN
    SELECT * INTO v_badge FROM badges WHERE badge_type = 'completion';
    
    IF v_badge IS NOT NULL THEN
      INSERT INTO participant_badges (participant_id, badge_id)
      VALUES (v_participant_id, v_badge.id)
      ON CONFLICT (participant_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_evaluate_badges
AFTER INSERT ON visits
FOR EACH ROW
EXECUTE FUNCTION evaluate_badges();
