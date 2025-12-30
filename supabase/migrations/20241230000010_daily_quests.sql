-- Create Quests Table
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create User Quests Table (Tracking completions)
CREATE TABLE IF NOT EXISTS public.user_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'approved', -- potentially 'pending' later
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, quest_id) -- User can only complete a quest once (for now)
);

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_quests_active ON public.quests(is_active);
CREATE INDEX IF NOT EXISTS idx_user_quests_user ON public.user_quests(user_id);
