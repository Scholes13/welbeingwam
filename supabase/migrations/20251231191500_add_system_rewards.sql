-- Add is_system column to rewards to identify non-listed rewards
ALTER TABLE public.rewards 
ADD COLUMN is_system boolean DEFAULT false;

-- Insert Avatar Reroll Reward
INSERT INTO public.rewards (title, description, required_points, required_steps, is_active, is_system, max_claims)
VALUES (
  'Avatar Reroll', 
  'Randomize your avatar appearance.', 
  500, -- Default Price 500 Coins
  0, 
  true, 
  true, -- System reward, hidden from standard list
  0
);
