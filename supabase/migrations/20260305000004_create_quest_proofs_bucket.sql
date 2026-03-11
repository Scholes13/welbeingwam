-- Create quest-proofs storage bucket (public so images can be viewed by admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-proofs', 'quest-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to quest-proofs
CREATE POLICY IF NOT EXISTS "Users can upload quest proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'quest-proofs');

-- Allow public read access (needed for admin to view photos)
CREATE POLICY IF NOT EXISTS "Public read quest proofs"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'quest-proofs');

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role full access quest proofs"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'quest-proofs');
