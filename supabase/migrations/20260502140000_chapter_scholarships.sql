-- Chapter scholarships: VP of Scholarship & Awards manages; all members see active listings.

CREATE OR REPLACE FUNCTION public.is_vp_scholarship_awards(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND 'VP of Scholarship & Awards' = ANY (COALESCE(p.positions, '{}'::text[]))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_chapter_scholarships(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_vp_scholarship_awards(_user_id)
  OR public.is_admin_or_officer(_user_id);
$$;

CREATE TABLE public.chapter_scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  application_instructions text,
  info_url text,
  application_url text,
  amount_summary text,
  due_date date,
  winner_user_id uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  winner_display_name text,
  academic_year text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapter_scholarships_active_sort ON public.chapter_scholarships (is_active, sort_order, due_date);

CREATE TRIGGER chapter_scholarships_updated_at
  BEFORE UPDATE ON public.chapter_scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chapter_scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active scholarships"
  ON public.chapter_scholarships
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.can_manage_chapter_scholarships(auth.uid())
  );

CREATE POLICY "VP scholarship or officers can insert scholarships"
  ON public.chapter_scholarships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_chapter_scholarships(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "VP scholarship or officers can update scholarships"
  ON public.chapter_scholarships
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_chapter_scholarships(auth.uid()))
  WITH CHECK (public.can_manage_chapter_scholarships(auth.uid()));

CREATE POLICY "VP scholarship or officers can delete scholarships"
  ON public.chapter_scholarships
  FOR DELETE
  TO authenticated
  USING (public.can_manage_chapter_scholarships(auth.uid()));
