-- Treat members with any exec position in profiles.positions as admin/officer-equivalent
-- for RLS checks used throughout admin dashboards.
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
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND COALESCE(array_length(positions, 1), 0) > 0
  )
$$;
