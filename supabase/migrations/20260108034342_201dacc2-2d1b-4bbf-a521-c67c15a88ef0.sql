-- Update RLS policy to admin-only for profile updates (not officers)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add 'inactive' to member_status enum
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'inactive';