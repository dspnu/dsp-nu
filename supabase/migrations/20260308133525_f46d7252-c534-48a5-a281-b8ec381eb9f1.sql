
-- Create storage bucket for service hour photos
INSERT INTO storage.buckets (id, name, public) VALUES ('service-hours-photos', 'service-hours-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload service photos
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload service photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-hours-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow public read of service photos
DO $$ BEGIN
  CREATE POLICY "Anyone can view service photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-hours-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow users to delete their own service photos
DO $$ BEGIN
  CREATE POLICY "Users can delete own service photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'service-hours-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
