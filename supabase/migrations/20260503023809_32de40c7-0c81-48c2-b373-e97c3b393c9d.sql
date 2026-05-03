
CREATE TABLE public.chapter_scholarships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  application_instructions text,
  info_url text,
  application_url text,
  amount_summary text,
  due_date date,
  winner_user_id uuid,
  winner_display_name text,
  academic_year text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Officers can manage scholarships"
  ON public.chapter_scholarships FOR ALL
  TO authenticated
  USING (public.is_admin_or_officer(auth.uid()));

CREATE POLICY "All authenticated can view scholarships"
  ON public.chapter_scholarships FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_chapter_scholarships_updated_at
  BEFORE UPDATE ON public.chapter_scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
