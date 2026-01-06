-- Update Avatar Reroll price to 10 coins
UPDATE public.rewards
SET required_points = 10
WHERE title = 'Avatar Reroll';
