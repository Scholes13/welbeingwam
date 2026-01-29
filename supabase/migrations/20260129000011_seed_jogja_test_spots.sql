-- Delete existing Bali spots
DELETE FROM visits;
DELETE FROM quest_spots;

-- Seed test quest spots in Condongcatur, Jogja area
-- Around Werkudara Group location (110.3897, -7.7567)

DO $$
DECLARE
  v_culinary_id UUID;
  v_shopping_id UUID;
  v_photo_id UUID;
  v_nature_id UUID;
BEGIN
  SELECT id INTO v_culinary_id FROM categories WHERE name = 'Culinary' LIMIT 1;
  SELECT id INTO v_shopping_id FROM categories WHERE name = 'Shopping' LIMIT 1;
  SELECT id INTO v_photo_id FROM categories WHERE name = 'Photo Spot' LIMIT 1;
  SELECT id INTO v_nature_id FROM categories WHERE name = 'Nature' LIMIT 1;

  -- Insert test spots near Werkudara Group, Condongcatur
  INSERT INTO quest_spots (name, description, location, radius, points, category_id, is_active) VALUES
    -- Werkudara Group area (your current location)
    ('Werkudara Group', 'Starting point - Werkudara Group office', 
     ST_SetSRID(ST_MakePoint(110.3897, -7.7567), 4326)::geography, 50, 50, v_photo_id, true),
    
    -- Alfamart nearby (estimated ~100m away)
    ('Alfamart Condongcatur', 'Convenience store near Werkudara', 
     ST_SetSRID(ST_MakePoint(110.3905, -7.7560), 4326)::geography, 30, 25, v_shopping_id, true),
    
    -- Terminal Condongcatur
    ('Terminal Condongcatur', 'Bus terminal Condongcatur', 
     ST_SetSRID(ST_MakePoint(110.3923, -7.7539), 4326)::geography, 100, 75, v_photo_id, true),
    
    -- Nearby spots for testing
    ('Indomaret Seturan', 'Indomaret di Jalan Seturan', 
     ST_SetSRID(ST_MakePoint(110.3950, -7.7580), 4326)::geography, 30, 25, v_shopping_id, true),
    
    ('Warung Makan Seturan', 'Warung makan dekat kampus', 
     ST_SetSRID(ST_MakePoint(110.3880, -7.7590), 4326)::geography, 40, 50, v_culinary_id, true),
    
    ('Taman Seturan', 'Area hijau untuk bersantai', 
     ST_SetSRID(ST_MakePoint(110.3870, -7.7550), 4326)::geography, 50, 50, v_nature_id, true);

END $$;

-- Update tour session for Jogja
UPDATE tour_sessions SET 
  name = 'Jogja City Tour Trial',
  start_time = NOW(),
  end_time = NOW() + INTERVAL '5 hours',
  is_active = true
WHERE is_active = true;

-- If no active session, create one
INSERT INTO tour_sessions (name, start_time, end_time, is_active)
SELECT 'Jogja City Tour Trial', NOW(), NOW() + INTERVAL '5 hours', true
WHERE NOT EXISTS (SELECT 1 FROM tour_sessions WHERE is_active = true);
