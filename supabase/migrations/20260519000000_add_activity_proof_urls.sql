-- Allow activities to store multiple proof image URLs.
-- Keeps legacy `proof_url` (single TEXT) populated with the first image
-- for backward compatibility with existing readers.

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS proof_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: hydrate proof_urls from existing proof_url where available
UPDATE public.activities
SET proof_urls = ARRAY[proof_url]
WHERE proof_url IS NOT NULL
  AND proof_url <> ''
  AND (proof_urls IS NULL OR array_length(proof_urls, 1) IS NULL);
