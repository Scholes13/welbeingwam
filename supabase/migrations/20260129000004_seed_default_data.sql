-- Insert default categories
INSERT INTO categories (name, icon_url, color, sort_order) VALUES
  ('Historical', NULL, '#8B4513', 1),
  ('Culinary', NULL, '#FF6347', 2),
  ('Art', NULL, '#9370DB', 3),
  ('Nature', NULL, '#228B22', 4),
  ('Shopping', NULL, '#FFD700', 5),
  ('Photo Spot', NULL, '#FF1493', 6);

-- Insert default badges for each category
INSERT INTO badges (name, description, badge_type, category_id, bonus_points)
SELECT 
  'Sejarawan Kota - ' || c.name,
  'Visited 5 consecutive ' || c.name || ' spots',
  'category_streak',
  c.id,
  200
FROM categories c;

-- Insert special badges
INSERT INTO badges (name, description, badge_type, category_id, bonus_points) VALUES
  ('Speed Demon', 'Visited 10 spots in the first hour', 'speed_demon', NULL, 300),
  ('City Explorer', 'Completed all quest spots', 'completion', NULL, 0);

-- Insert default settings values
INSERT INTO settings (key, value) VALUES
  ('base_checkin_points', '50'),
  ('photo_bonus_points', '50'),
  ('category_streak_bonus', '200'),
  ('speed_demon_bonus', '300'),
  ('strava_sync_cooldown_minutes', '15'),
  ('feature_photo_checkin', 'true'),
  ('feature_badges', 'true'),
  ('feature_leaderboard', 'true'),
  ('feature_category_filter', 'true')
ON CONFLICT (key) DO NOTHING;
