BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

WITH unique_profiles AS (
  SELECT LOWER(username) AS normalized_username
  FROM public.profiles
  WHERE username IS NOT NULL
  GROUP BY LOWER(username)
  HAVING COUNT(*) = 1
),
candidate_mappings AS (
  SELECT
    p.id AS profile_id,
    u.id AS auth_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.id
      ORDER BY CASE
        WHEN LOWER(u.email) = LOWER(p.username || '@werkudara.com') THEN 0
        ELSE 1
      END
    ) AS profile_match_rank,
    COUNT(*) OVER (PARTITION BY u.id) AS auth_match_count
  FROM public.profiles AS p
  JOIN unique_profiles up
    ON up.normalized_username = LOWER(p.username)
  JOIN auth.users AS u
    ON LOWER(u.email) = LOWER(p.username || '@werkudara.com')
    OR LOWER(u.email) = LOWER(p.username || '@wam.local')
  WHERE p.auth_user_id IS NULL
    AND p.username IS NOT NULL
)
UPDATE public.profiles AS p
SET auth_user_id = cm.auth_user_id
FROM candidate_mappings cm
WHERE p.id = cm.profile_id
  AND cm.profile_match_rank = 1
  AND cm.auth_match_count = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id_unique
ON public.profiles(auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL;

COMMIT;
