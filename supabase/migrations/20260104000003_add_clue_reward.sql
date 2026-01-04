-- Add "Reveal Clues" reward to the rewards table
INSERT INTO rewards (title, description, required_points, is_active, image_url, max_claims)
VALUES (
    'Reveal Spot Clues',
    'Unlock hints to find all hidden QR spots!',
    200,
    true,
    null,
    0
)
ON CONFLICT DO NOTHING;
