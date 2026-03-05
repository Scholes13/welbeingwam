-- Quest templates for auto-recurring quests
CREATE TABLE IF NOT EXISTS public.quest_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dimension_id UUID REFERENCES public.dimensions(id),
    points INT NOT NULL DEFAULT 0,
    verification_type TEXT NOT NULL DEFAULT 'none',
    requires_photo BOOLEAN DEFAULT false,
    recurrence TEXT NOT NULL DEFAULT 'daily',
    trigger_type TEXT NOT NULL DEFAULT 'scheduled',
    linked_activity_type_id UUID REFERENCES public.activity_types(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access quest_templates"
    ON public.quest_templates FOR ALL
    TO service_role
    USING (true);

-- Add photo support to existing quest tables
ALTER TABLE public.quests
    ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.quest_templates(id);

ALTER TABLE public.user_quests
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_note TEXT;
