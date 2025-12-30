-- Create Rewards Table if not exists
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    required_points INTEGER DEFAULT 0,
    required_steps INTEGER DEFAULT 0,
    max_claims INTEGER DEFAULT 0, -- 0 means unlimited
    total_claimed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Re-create Policy for Rewards
DROP POLICY IF EXISTS "Public rewards are viewable by everyone" ON public.rewards;
CREATE POLICY "Public rewards are viewable by everyone" ON public.rewards
    FOR SELECT USING (true);

-- Create User Rewards Table if not exists
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, reward_id)
);

-- Enable RLS for User Rewards
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Re-create Policies for User Rewards
-- Note: Removed auth.uid() policies because we use Custom Auth with BIGINT IDs.
-- Security is handled by API Layer (Service Role). Default RLS is Deny All for anon.
DROP POLICY IF EXISTS "Users can view own claims" ON public.user_rewards;
DROP POLICY IF EXISTS "Users can claim rewards" ON public.user_rewards;

-- Indexes (IF NOT EXISTS is supported in Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON public.rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);

-- Grant permissions
GRANT ALL ON public.rewards TO postgres, service_role;
GRANT SELECT ON public.rewards TO anon, authenticated;

GRANT ALL ON public.user_rewards TO postgres, service_role;
GRANT SELECT, INSERT ON public.user_rewards TO anon, authenticated;

-- Force Schema Refresh
NOTIFY pgrst, 'reload config';
