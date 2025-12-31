-- Add cost column to user_rewards to track spent coins
ALTER TABLE public.user_rewards 
ADD COLUMN cost integer DEFAULT 0;

-- Backfill cost from current rewards data
UPDATE public.user_rewards ur
SET cost = r.required_points
FROM public.rewards r
WHERE ur.reward_id = r.id;
