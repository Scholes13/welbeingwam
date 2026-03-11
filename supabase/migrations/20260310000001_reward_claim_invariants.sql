BEGIN;

ALTER TABLE public.rewards
ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN NOT NULL DEFAULT false;

UPDATE public.rewards
SET is_repeatable = true
WHERE title IN ('Avatar Reroll', 'Background Reroll', 'Reveal Spot Clues');

ALTER TABLE public.user_rewards
ADD COLUMN IF NOT EXISTS claim_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.user_rewards
ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_rewards
DROP CONSTRAINT IF EXISTS user_rewards_user_id_reward_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rewards_claim_status_check'
  ) THEN
    ALTER TABLE public.user_rewards
    ADD CONSTRAINT user_rewards_claim_status_check
    CHECK (claim_status IN ('active', 'voided_duplicate', 'voided_oversold'));
  END IF;
END
$$;

UPDATE public.user_rewards ur
SET is_repeatable = COALESCE(r.is_repeatable, false)
FROM public.rewards r
WHERE r.id = ur.reward_id;

WITH ranked_duplicates AS (
  SELECT
    ur.id,
    ROW_NUMBER() OVER (
      PARTITION BY ur.user_id, ur.reward_id
      ORDER BY ur.claimed_at ASC, ur.id ASC
    ) AS duplicate_rank
  FROM public.user_rewards ur
  JOIN public.rewards r ON r.id = ur.reward_id
  WHERE COALESCE(r.is_repeatable, false) = false
)
UPDATE public.user_rewards ur
SET claim_status = 'voided_duplicate'
FROM ranked_duplicates d
WHERE ur.id = d.id
  AND d.duplicate_rank > 1;

WITH ranked_oversold AS (
  SELECT
    ur.id,
    r.max_claims,
    ROW_NUMBER() OVER (
      PARTITION BY ur.reward_id
      ORDER BY ur.claimed_at ASC, ur.id ASC
    ) AS claim_rank
  FROM public.user_rewards ur
  JOIN public.rewards r ON r.id = ur.reward_id
  WHERE ur.claim_status = 'active'
    AND COALESCE(r.max_claims, 0) > 0
)
UPDATE public.user_rewards ur
SET claim_status = 'voided_oversold'
FROM ranked_oversold ro
WHERE ur.id = ro.id
  AND ro.claim_rank > ro.max_claims;

UPDATE public.rewards r
SET total_claimed = claim_counts.active_count
FROM (
  SELECT reward_id, COUNT(*)::INT AS active_count
  FROM public.user_rewards
  WHERE claim_status = 'active'
  GROUP BY reward_id
) AS claim_counts
WHERE r.id = claim_counts.reward_id;

UPDATE public.rewards
SET total_claimed = 0
WHERE id NOT IN (
  SELECT reward_id
  FROM public.user_rewards
  WHERE claim_status = 'active'
);

CREATE OR REPLACE FUNCTION public.sync_user_reward_repeatable_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT COALESCE(r.is_repeatable, false)
  INTO NEW.is_repeatable
  FROM public.rewards r
  WHERE r.id = NEW.reward_id;

  IF NEW.claim_status IS NULL THEN
    NEW.claim_status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_rewards_sync_repeatable_flag ON public.user_rewards;
CREATE TRIGGER user_rewards_sync_repeatable_flag
BEFORE INSERT OR UPDATE OF reward_id
ON public.user_rewards
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_reward_repeatable_flag();

CREATE OR REPLACE FUNCTION public.enforce_reward_claim_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  reward_max_claims INTEGER;
  active_claim_count INTEGER;
BEGIN
  IF NEW.claim_status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(r.max_claims, 0)
  INTO reward_max_claims
  FROM public.rewards r
  WHERE r.id = NEW.reward_id;

  IF reward_max_claims <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO active_claim_count
  FROM public.user_rewards ur
  WHERE ur.reward_id = NEW.reward_id
    AND ur.claim_status = 'active'
    AND ur.id <> COALESCE(NEW.id, ''::uuid);

  IF active_claim_count >= reward_max_claims THEN
    RAISE EXCEPTION 'reward_sold_out'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_rewards_enforce_reward_claim_limit ON public.user_rewards;
CREATE TRIGGER user_rewards_enforce_reward_claim_limit
BEFORE INSERT OR UPDATE OF reward_id, claim_status
ON public.user_rewards
FOR EACH ROW
EXECUTE FUNCTION public.enforce_reward_claim_limit();

DROP INDEX IF EXISTS idx_user_rewards_active_unique_non_repeatable;
CREATE UNIQUE INDEX idx_user_rewards_active_unique_non_repeatable
ON public.user_rewards (user_id, reward_id)
WHERE claim_status = 'active' AND is_repeatable = false;

COMMIT;
