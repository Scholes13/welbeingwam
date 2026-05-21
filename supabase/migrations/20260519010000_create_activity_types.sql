-- ---------------------------------------------------------------------------
-- activity_types — editable catalog of daily and sport activities (CMS).
-- Replaces the hardcoded `ACTIVITIES_BY_DIMENSION` and `SPORT_OPTIONS` lists.
--
-- Admins can:
--   * rename activities (`name`)
--   * adjust the fixed point award (`points`)
--   * toggle visibility without deletion (`is_active`)
--
-- Stable identifiers (`code`) keep historical rows in `activities.type` linked
-- to their definition even after rename.
--
-- This migration is idempotent across two historical shapes:
--   * Fresh DB: CREATE TABLE creates the full table.
--   * Legacy DB (table created by 20260217000001 with id/name/description
--     /is_active only): ADD COLUMN IF NOT EXISTS plus backfill aligns the
--     shape before any constraint or index references the new columns.
-- ---------------------------------------------------------------------------

-- 1. Create table if it does not exist (fresh DB path).
CREATE TABLE IF NOT EXISTS public.activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT NOT NULL,
    mode TEXT,
    dimension_id UUID REFERENCES public.dimensions(id) ON DELETE SET NULL,
    points INTEGER NOT NULL DEFAULT 0,
    requires_steps BOOLEAN NOT NULL DEFAULT false,
    requires_calories BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Defensive column additions for legacy DBs.
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS dimension_id UUID REFERENCES public.dimensions(id) ON DELETE SET NULL;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS requires_steps BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS requires_calories BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.activity_types ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Backfill code/mode for any pre-existing rows (legacy DBs only).
UPDATE public.activity_types
SET code = 'legacy.' || regexp_replace(lower(name), '[^a-z0-9]+', '_', 'g')
WHERE code IS NULL;

UPDATE public.activity_types SET mode = 'daily' WHERE mode IS NULL;

-- 4. Enforce NOT NULL + UNIQUE / CHECK once data is consistent.
ALTER TABLE public.activity_types ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.activity_types ALTER COLUMN mode SET NOT NULL;

-- Drop legacy UNIQUE(name) inherited from 20260217000001 — `code` is the
-- canonical stable identifier now, and the seed intentionally reuses display
-- names (e.g. "Badminton" exists as both physical.badminton and sport.badminton).
ALTER TABLE public.activity_types DROP CONSTRAINT IF EXISTS activity_types_name_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.activity_types'::regclass
          AND conname = 'activity_types_code_key'
    ) THEN
        ALTER TABLE public.activity_types
            ADD CONSTRAINT activity_types_code_key UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.activity_types'::regclass
          AND conname = 'activity_types_mode_check'
    ) THEN
        ALTER TABLE public.activity_types
            ADD CONSTRAINT activity_types_mode_check
            CHECK (mode IN ('daily', 'sport'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_types_mode ON public.activity_types(mode);
CREATE INDEX IF NOT EXISTS idx_activity_types_dimension_id ON public.activity_types(dimension_id);
CREATE INDEX IF NOT EXISTS idx_activity_types_is_active ON public.activity_types(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_activity_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_types_touch ON public.activity_types;
CREATE TRIGGER trg_activity_types_touch
BEFORE UPDATE ON public.activity_types
FOR EACH ROW EXECUTE FUNCTION public.touch_activity_types_updated_at();

-- RLS: read for all authenticated, write for service role only (admin API uses service role)
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_types read all" ON public.activity_types;
CREATE POLICY "activity_types read all"
    ON public.activity_types FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "activity_types service write" ON public.activity_types;
CREATE POLICY "activity_types service write"
    ON public.activity_types FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Seed: original hardcoded activities. The catalog is replaced wholesale by
-- migration 20260521000000, so this insert exists only to give fresh DBs a
-- starting set with stable codes. Idempotent via ON CONFLICT (code).
-- ---------------------------------------------------------------------------

INSERT INTO public.activity_types (code, name, mode, dimension_id, points, requires_steps, requires_calories, is_active, sort_order)
SELECT v.code, v.name, v.mode, d.id, v.points, v.requires_steps, v.requires_calories, true, v.sort_order
FROM (VALUES
    -- Physical (daily)
    ('physical.werkudara_workout', 'Werkudara Workout Fitness', 'daily', 'physical', 50, false, false, 10),
    ('physical.yoga',              'Yoga',                       'daily', 'physical', 50, false, false, 20),
    ('physical.badminton',         'Badminton',                  'daily', 'physical', 50, false, false, 30),
    ('physical.hiking',            'Mountaineering / Hiking',    'daily', 'physical', 75, false, false, 40),
    ('physical.treadmill',         'Treadmill',                  'daily', 'physical', 30, false, false, 50),
    ('physical.olahraga_sendiri',  'Olahraga yang Dilakukan Sendiri', 'daily', 'physical', 40, false, false, 60),
    ('physical.steps',             'Steps',                      'daily', 'physical',  0, true,  false, 70),

    -- Emotional (daily)
    ('emotional.konsultasi',       'Konsultasi / Konseling / Sharing Session Mental Health', 'daily', 'emotional', 50, false, false, 10),
    ('emotional.hobi',             'Penyaluran Hobi / Minat dengan Aktivitas Sosial',        'daily', 'emotional', 30, false, false, 20),

    -- Social (daily)
    ('social.team_building',       'Team Building / Gathering / WAM / Internal Activities', 'daily', 'social', 50, false, false, 10),
    ('social.kegiatan_sosial',     'Kegiatan Sosial di Luar Kantor (CSR, Bakti Sosial, Arisan, dsb)', 'daily', 'social', 40, false, false, 20),
    ('social.csr',                 'CSR',                                                    'daily', 'social', 60, false, false, 30),

    -- Financial (daily)
    ('financial.tabungan',         'Program Tabungan atau Benefit Financial',                'daily', 'financial', 30, false, false, 10),
    ('financial.seminar',          'Seminar & Edukasi Pengelolaan Keuangan dan Investasi',   'daily', 'financial', 50, false, false, 20),

    -- Spiritual (daily)
    ('spiritual.ibadah',           'Ibadah Tidak Wajib',                                     'daily', 'spiritual', 30, false, false, 10),

    -- Sport (calories-based, no dimension binding here — defaults to physical at runtime)
    ('sport.running',   'Running',   'sport', NULL, 0, false, true, 10),
    ('sport.cycling',   'Cycling',   'sport', NULL, 0, false, true, 20),
    ('sport.swimming',  'Swimming',  'sport', NULL, 0, false, true, 30),
    ('sport.workout',   'Workout',   'sport', NULL, 0, false, true, 40),
    ('sport.badminton', 'Badminton', 'sport', NULL, 0, false, true, 50),
    ('sport.futsal',    'Futsal',    'sport', NULL, 0, false, true, 60),
    ('sport.other',     'Other',     'sport', NULL, 0, false, true, 70)
) AS v(code, name, mode, dim_name, points, requires_steps, requires_calories, sort_order)
LEFT JOIN public.dimensions d ON d.name = v.dim_name
ON CONFLICT (code) DO NOTHING;
