-- Ensure quest-proofs bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-proofs', 'quest-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies if they exist, then recreate cleanly
DROP POLICY IF EXISTS "Users can upload quest proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read quest proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public read quest proofs" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access quest proofs" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload quest proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'quest-proofs');

-- Allow public read (admin & anyone with URL can view photos)
CREATE POLICY "Public read quest proofs"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'quest-proofs');

-- Allow service role full access
CREATE POLICY "Service role full access quest proofs"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'quest-proofs');
