BEGIN;

ALTER TABLE public.activity_types
    ADD COLUMN IF NOT EXISTS parent_type_id uuid REFERENCES public.activity_types(id);

CREATE INDEX IF NOT EXISTS idx_activity_types_parent_type_id ON public.activity_types(parent_type_id);

WITH internal_type AS (
    SELECT id
    FROM public.activity_types
    WHERE lower(name) = 'internal activity'
    LIMIT 1
)
UPDATE public.activity_types t
SET parent_type_id = internal_type.id
FROM internal_type
WHERE t.parent_type_id IS NULL
  AND lower(t.name) <> 'internal activity'
  AND EXISTS (
      SELECT 1
      FROM public.admin_activities a
      WHERE a.type_id = t.id
  );

COMMIT;
