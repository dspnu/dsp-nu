
INSERT INTO storage.buckets (id, name, public)
VALUES ('paddle-media', 'paddle-media', true);

CREATE POLICY "Anyone can view paddle media"
ON storage.objects FOR SELECT
USING (bucket_id = 'paddle-media');

CREATE POLICY "Authenticated users can upload paddle media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'paddle-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own paddle media"
ON storage.objects FOR DELETE
USING (bucket_id = 'paddle-media' AND auth.uid()::text = (storage.foldername(name))[1]);
