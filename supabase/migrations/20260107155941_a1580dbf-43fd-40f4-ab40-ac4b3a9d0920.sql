-- Allow admins/officers to update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR is_admin_or_officer(auth.uid()));

-- Update member_status enum: combine shiny and new_mem into new_member
-- First update existing data
UPDATE public.profiles SET status = 'new_mem' WHERE status = 'shiny';

-- Now alter the enum (remove shiny)
ALTER TYPE public.member_status RENAME TO member_status_old;

CREATE TYPE public.member_status AS ENUM ('active', 'alumni', 'new_member', 'pnm');

ALTER TABLE public.profiles 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.member_status USING (
    CASE 
      WHEN status::text = 'new_mem' THEN 'new_member'::public.member_status
      WHEN status::text = 'shiny' THEN 'new_member'::public.member_status
      ELSE status::text::public.member_status
    END
  ),
  ALTER COLUMN status SET DEFAULT 'active'::public.member_status;

DROP TYPE public.member_status_old;