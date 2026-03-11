-- Add dimension_id to quests table
ALTER TABLE public.quests
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Add dimension_id to activity_types table
ALTER TABLE public.activity_types
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Add dimension_id to point_adjustments table
ALTER TABLE public.point_adjustments
    ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quests_dimension_id ON public.quests(dimension_id);
CREATE INDEX IF NOT EXISTS idx_activity_types_dimension_id ON public.activity_types(dimension_id);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_dimension_id ON public.point_adjustments(dimension_id);
