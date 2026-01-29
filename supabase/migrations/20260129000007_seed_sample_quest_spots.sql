-- Seed sample quest spots in Bali for testing
-- Using popular locations in Ubud and surrounding areas

-- Get category IDs
DO $$
DECLARE
  v_historical_id UUID;
  v_culinary_id UUID;
  v_art_id UUID;
  v_nature_id UUID;
  v_shopping_id UUID;
  v_photo_id UUID;
BEGIN
  SELECT id INTO v_historical_id FROM categories WHERE name = 'Historical' LIMIT 1;
  SELECT id INTO v_culinary_id FROM categories WHERE name = 'Culinary' LIMIT 1;
  SELECT id INTO v_art_id FROM categories WHERE name = 'Art' LIMIT 1;
  SELECT id INTO v_nature_id FROM categories WHERE name = 'Nature' LIMIT 1;
  SELECT id INTO v_shopping_id FROM categories WHERE name = 'Shopping' LIMIT 1;
  SELECT id INTO v_photo_id FROM categories WHERE name = 'Photo Spot' LIMIT 1;

  -- Insert sample quest spots
  INSERT INTO quest_spots (name, description, location, radius, points, category_id, is_active) VALUES
    -- Historical spots
    ('Pura Tirta Empul', 'Ancient Balinese Hindu water temple famous for its holy spring water', 
     ST_SetSRID(ST_MakePoint(115.3156, -8.4153), 4326)::geography, 100, 100, v_historical_id, true),
    
    ('Goa Gajah', 'Elephant Cave - 9th century archaeological site with rock-wall carvings', 
     ST_SetSRID(ST_MakePoint(115.2873, -8.5244), 4326)::geography, 80, 100, v_historical_id, true),
    
    ('Pura Gunung Kawi', 'Ancient temple with royal tombs carved into cliff face', 
     ST_SetSRID(ST_MakePoint(115.3108, -8.4222), 4326)::geography, 100, 100, v_historical_id, true),

    -- Culinary spots
    ('Ubud Traditional Market', 'Famous morning market with local food and crafts', 
     ST_SetSRID(ST_MakePoint(115.2625, -8.5069), 4326)::geography, 50, 50, v_culinary_id, true),
    
    ('Bebek Bengil (Dirty Duck)', 'Iconic restaurant famous for crispy duck', 
     ST_SetSRID(ST_MakePoint(115.2589, -8.5156), 4326)::geography, 30, 50, v_culinary_id, true),
    
    ('Locavore Restaurant', 'Award-winning farm-to-table fine dining', 
     ST_SetSRID(ST_MakePoint(115.2631, -8.5058), 4326)::geography, 30, 75, v_culinary_id, true),

    -- Art spots
    ('ARMA Museum', 'Agung Rai Museum of Art - Balinese and Indonesian art collection', 
     ST_SetSRID(ST_MakePoint(115.2647, -8.5189), 4326)::geography, 60, 75, v_art_id, true),
    
    ('Neka Art Museum', 'Comprehensive collection of Balinese paintings', 
     ST_SetSRID(ST_MakePoint(115.2511, -8.4978), 4326)::geography, 60, 75, v_art_id, true),
    
    ('Ubud Palace', 'Royal palace with traditional Balinese architecture', 
     ST_SetSRID(ST_MakePoint(115.2628, -8.5061), 4326)::geography, 50, 75, v_art_id, true),

    -- Nature spots
    ('Tegallalang Rice Terrace', 'Iconic terraced rice paddies with stunning views', 
     ST_SetSRID(ST_MakePoint(115.2789, -8.4314), 4326)::geography, 150, 100, v_nature_id, true),
    
    ('Campuhan Ridge Walk', 'Scenic walking path between two valleys', 
     ST_SetSRID(ST_MakePoint(115.2533, -8.5017), 4326)::geography, 100, 75, v_nature_id, true),
    
    ('Monkey Forest Ubud', 'Sacred sanctuary with hundreds of monkeys', 
     ST_SetSRID(ST_MakePoint(115.2589, -8.5183), 4326)::geography, 100, 75, v_nature_id, true),

    -- Shopping spots
    ('Sukawati Art Market', 'Traditional market for Balinese handicrafts', 
     ST_SetSRID(ST_MakePoint(115.2917, -8.5956), 4326)::geography, 80, 50, v_shopping_id, true),
    
    ('Ubud Art Market', 'Central market for souvenirs and local crafts', 
     ST_SetSRID(ST_MakePoint(115.2631, -8.5067), 4326)::geography, 40, 50, v_shopping_id, true),

    -- Photo spots
    ('Bali Swing', 'Famous swing with jungle backdrop', 
     ST_SetSRID(ST_MakePoint(115.2778, -8.4208), 4326)::geography, 80, 100, v_photo_id, true),
    
    ('Tegenungan Waterfall', 'Beautiful waterfall near Ubud', 
     ST_SetSRID(ST_MakePoint(115.2892, -8.5753), 4326)::geography, 100, 100, v_photo_id, true),
    
    ('Tirta Gangga Water Palace', 'Royal water garden with ornate pools', 
     ST_SetSRID(ST_MakePoint(115.5872, -8.4117), 4326)::geography, 80, 100, v_photo_id, true);

END $$;

-- Create a sample active tour session (5 hours from now)
INSERT INTO tour_sessions (name, start_time, end_time, is_active) VALUES
  ('Bali City Tour Demo', NOW(), NOW() + INTERVAL '5 hours', true)
ON CONFLICT DO NOTHING;
