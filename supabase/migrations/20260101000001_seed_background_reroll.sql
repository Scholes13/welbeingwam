-- Seed Background Reroll reward
INSERT INTO rewards (title, description, required_points, image_url, max_claims)
VALUES ('Background Reroll', 'Randomize your ID card background!', 300, NULL, 0)
ON CONFLICT DO NOTHING;
