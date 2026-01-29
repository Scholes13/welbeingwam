-- View for leaderboard with ranking logic
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  p.id,
  p.code,
  p.name,
  p.profile_photo_url,
  p.total_points,
  COUNT(DISTINCT v.spot_id) as spots_visited,
  COUNT(DISTINCT pb.badge_id) as badge_count,
  MAX(v.checked_in_at) as last_checkin,
  RANK() OVER (
    ORDER BY p.total_points DESC, 
    MAX(v.checked_in_at) ASC NULLS LAST
  ) as rank
FROM participants p
LEFT JOIN visits v ON p.id = v.participant_id
LEFT JOIN participant_badges pb ON p.id = pb.participant_id
WHERE p.is_admin = FALSE
GROUP BY p.id, p.code, p.name, p.profile_photo_url, p.total_points
ORDER BY rank;

-- Enable Realtime for visits table
ALTER PUBLICATION supabase_realtime ADD TABLE visits;

-- Enable Realtime for participant_badges table
ALTER PUBLICATION supabase_realtime ADD TABLE participant_badges;
