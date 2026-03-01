
-- Create approved coffee chat members table (separate from profiles)
CREATE TABLE public.approved_coffee_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  osu_email TEXT,
  dsp_position TEXT,
  majors TEXT,
  minors TEXT,
  hometown TEXT,
  state TEXT,
  school_year TEXT,
  pledge_class TEXT,
  family TEXT,
  grand_big TEXT,
  big TEXT,
  littles TEXT,
  osu_involvements TEXT,
  internships_experiences TEXT,
  hobbies_interests TEXT,
  fun_facts TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approved_coffee_chat_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view approved members"
ON public.approved_coffee_chat_members FOR SELECT
USING (true);

CREATE POLICY "Admin/Officers can manage approved members"
ON public.approved_coffee_chat_members FOR ALL
USING (is_admin_or_officer(auth.uid()));
