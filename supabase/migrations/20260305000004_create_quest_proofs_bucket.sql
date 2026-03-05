-- Create quest-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-proofs', 'quest-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to quest-proofs
CREATE POLICY "Users can upload quest proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'quest-proofs');

-- Allow authenticated users to read quest proofs
CREATE POLICY "Users can read quest proofs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'quest-proofs');

-- Allow service role full access
CREATE POLICY "Service role full access quest proofs"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'quest-proofs');
