-- Support exec moderation access and ensure member submissions can be approved.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'exec';

CREATE OR REPLACE FUNCTION public.is_admin_or_officer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'officer', 'exec')
  )
$$;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

UPDATE public.resources
SET is_approved = true
WHERE is_approved IS DISTINCT FROM true;

DROP POLICY IF EXISTS "Users can view public resources" ON public.resources;
DROP POLICY IF EXISTS "Users can view approved or own resources" ON public.resources;
CREATE POLICY "Users can view approved or own resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_officer(auth.uid())
  OR uploaded_by = auth.uid()
  OR (
    is_approved = true
    AND (is_officer_only = false OR public.is_admin_or_officer(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can submit resources" ON public.resources;
CREATE POLICY "Users can submit resources"
ON public.resources
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "All authenticated users can view approved jobs" ON public.job_posts;
CREATE POLICY "All authenticated users can view approved jobs"
ON public.job_posts
FOR SELECT
TO authenticated
USING (
  is_approved = true
  OR posted_by = auth.uid()
  OR public.is_admin_or_officer(auth.uid())
);
