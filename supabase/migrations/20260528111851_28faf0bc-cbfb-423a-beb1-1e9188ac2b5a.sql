-- Tighten storage INSERT policies to require user-owned folder paths

-- service-hours-photos: drop existing INSERT policies and add owner-folder-scoped one
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND qual::text LIKE '%service-hours-photos%'
        OR with_check::text LIKE '%service-hours-photos%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_hours_photos_insert_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-hours-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- paddle-media: drop existing INSERT policies and add owner-folder-scoped one
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND (qual::text LIKE '%paddle-media%' OR with_check::text LIKE '%paddle-media%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "paddle_media_insert_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'paddle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);