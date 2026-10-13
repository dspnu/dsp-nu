-- Admins and developers can set member status in bulk.
-- Marking someone alumni also copies their contact into the alumni directory
-- when a matching card is not already there.

CREATE OR REPLACE FUNCTION public.apply_member_statuses(
  p_ids uuid[],
  p_status public.member_status
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'developer')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update member status';
  END IF;

  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.profiles
  SET status = p_status
  WHERE id = ANY (p_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF p_status = 'alumni' THEN
    INSERT INTO public.alumni (
      first_name,
      last_name,
      email,
      phone,
      graduation_year,
      linkedin_url
    )
    SELECT
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.graduation_year,
      p.linkedin_url
    FROM public.profiles p
    WHERE p.id = ANY (p_ids)
      AND NOT EXISTS (
        SELECT 1
        FROM public.alumni a
        WHERE (
          p.email IS NOT NULL
          AND a.email IS NOT NULL
          AND lower(a.email) = lower(p.email)
        )
        OR (
          lower(a.first_name) = lower(p.first_name)
          AND lower(a.last_name) = lower(p.last_name)
          AND a.graduation_year IS NOT DISTINCT FROM p.graduation_year
        )
      );
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_member_statuses(uuid[], public.member_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_member_statuses(uuid[], public.member_status) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_member_statuses(uuid[], public.member_status) TO authenticated;
