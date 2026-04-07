-- Allow jacobtart8@gmail.com to manage roles (including granting admin)
CREATE OR REPLACE FUNCTION public.can_manage_user_roles(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR (auth.jwt() ->> 'email') = 'jacobtart8@gmail.com';
$$;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.can_manage_user_roles(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.can_manage_user_roles(auth.uid()))
WITH CHECK (public.can_manage_user_roles(auth.uid()));
