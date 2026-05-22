-- ---------------------------------------------------------------------------
-- Refresh Sport Session catalog to popular calories-friendly Strava-style rows.
--
-- Sport points are calories-based at runtime, so catalog points stay 0 and
-- requires_calories stays true. `sport.other` asks users for a specific sport
-- name via is_custom_input.
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.activity_types
    ADD COLUMN IF NOT EXISTS is_custom_input boolean NOT NULL DEFAULT false;

INSERT INTO public.activity_types (
    code, name, mode, dimension_id, points,
    requires_steps, requires_calories, is_active, sort_order,
    description, is_custom_input
)
SELECT
    v.code,
    v.name,
    'sport',
    NULL,
    0,
    false,
    true,
    true,
    v.sort_order,
    v.description,
    v.is_custom_input
FROM (VALUES
    ('sport.running',         'Running',          10,  'Calories-based running session', false),
    ('sport.trail_run',       'Trail Run',        20,  'Calories-based trail running session', false),
    ('sport.walking',         'Walking',          30,  'Calories-based walking session', false),
    ('sport.hiking',          'Hiking',           40,  'Calories-based hiking session', false),
    ('sport.ride',            'Ride / Cycling',   50,  'Calories-based cycling session', false),
    ('sport.mountain_bike',   'Mountain Bike',    60,  'Calories-based mountain biking session', false),
    ('sport.swimming',        'Swimming',         70,  'Calories-based swimming session', false),
    ('sport.workout',         'Workout',          80,  'Calories-based workout session', false),
    ('sport.hiit',            'HIIT',             90,  'Calories-based high-intensity interval training session', false),
    ('sport.weight_training', 'Weight Training',  100, 'Calories-based strength training session', false),
    ('sport.crossfit',        'Crossfit',         110, 'Calories-based Crossfit session', false),
    ('sport.yoga',            'Yoga',             120, 'Calories-based yoga session', false),
    ('sport.pilates',         'Pilates',          130, 'Calories-based Pilates session', false),
    ('sport.soccer_futsal',   'Soccer / Futsal',  140, 'Calories-based soccer or futsal session', false),
    ('sport.badminton',       'Badminton',        150, 'Calories-based badminton session', false),
    ('sport.tennis',          'Tennis',           160, 'Calories-based tennis session', false),
    ('sport.basketball',      'Basketball',       170, 'Calories-based basketball session', false),
    ('sport.volleyball',      'Volleyball',       180, 'Calories-based volleyball session', false),
    ('sport.rowing',          'Rowing',           190, 'Calories-based rowing session', false),
    ('sport.elliptical',      'Elliptical',       200, 'Calories-based elliptical session', false),
    ('sport.stair_stepper',   'Stair Stepper',    210, 'Calories-based stair stepper session', false),
    ('sport.virtual_ride',    'Virtual Ride',     220, 'Calories-based virtual cycling session', false),
    ('sport.virtual_run',     'Virtual Run',      230, 'Calories-based virtual running session', false),
    ('sport.other',           'Other',            240, 'Calories-based sport not listed in the catalog', true)
) AS v(code, name, sort_order, description, is_custom_input)
ON CONFLICT (code) DO UPDATE SET
    name              = EXCLUDED.name,
    mode              = EXCLUDED.mode,
    dimension_id      = EXCLUDED.dimension_id,
    points            = EXCLUDED.points,
    requires_steps    = EXCLUDED.requires_steps,
    requires_calories = EXCLUDED.requires_calories,
    is_active         = EXCLUDED.is_active,
    sort_order        = EXCLUDED.sort_order,
    description       = EXCLUDED.description,
    is_custom_input   = EXCLUDED.is_custom_input,
    updated_at        = now();

COMMIT;
