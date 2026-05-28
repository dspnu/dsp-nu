
-- Backfill president role for existing presidents
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'president'::public.app_role
FROM public.profiles p
WHERE COALESCE(p.positions, '{}'::text[]) @> ARRAY['President']::text[]
ON CONFLICT (user_id, role) DO NOTHING;

-- Rewrite is_chapter_president to use user_roles (not user-writable profiles.positions)
CREATE OR REPLACE FUNCTION public.is_chapter_president(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'president'::public.app_role
  );
$$;

-- Storage policy fixes
DROP POLICY IF EXISTS "Anyone can view service photos" ON storage.objects;

CREATE POLICY "Users can update own paddle media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'paddle-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'paddle-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Officers can update pdp files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdp-submissions' AND public.is_admin_or_officer(auth.uid()))
WITH CHECK (bucket_id = 'pdp-submissions' AND public.is_admin_or_officer(auth.uid()));

CREATE POLICY "Owners or officers can delete pdp files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdp-submissions'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin_or_officer(auth.uid())
  )
);
