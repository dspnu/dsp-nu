-- Allow moderation workflow for resources and jobs submitted by members.

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

-- Existing resources should stay visible to members.
UPDATE public.resources
SET is_approved = true
WHERE is_approved IS DISTINCT FROM true;

DROP POLICY IF EXISTS "Users can view public resources" ON public.resources;
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
