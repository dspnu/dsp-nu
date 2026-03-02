-- Add developer role and lock profile management to developers
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';

-- Restrict cross-profile updates to developers only
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Developers can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'developer'));

-- Grant developer role to jacobtart8@gmail.com if the account exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'developer'::public.app_role
FROM auth.users
WHERE lower(email) = 'jacobtart8@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
