
-- PDP Assignments
CREATE TABLE public.pdp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdp_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Officers can manage assignments" ON public.pdp_assignments
FOR ALL USING (is_admin_or_officer(auth.uid()));

CREATE POLICY "All authenticated users can view assignments" ON public.pdp_assignments
FOR SELECT USING (true);

CREATE TRIGGER update_pdp_assignments_updated_at
BEFORE UPDATE ON public.pdp_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PDP Submissions
CREATE TABLE public.pdp_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.pdp_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  file_urls TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'complete', 'incomplete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);

ALTER TABLE public.pdp_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own work" ON public.pdp_submissions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own submissions" ON public.pdp_submissions
FOR UPDATE USING (user_id = auth.uid() OR is_admin_or_officer(auth.uid()));

CREATE POLICY "Users can view own submissions" ON public.pdp_submissions
FOR SELECT USING (user_id = auth.uid() OR is_admin_or_officer(auth.uid()));

CREATE TRIGGER update_pdp_submissions_updated_at
BEFORE UPDATE ON public.pdp_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PDP Submission Comments
CREATE TABLE public.pdp_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.pdp_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdp_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add comments" ON public.pdp_comments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view relevant comments" ON public.pdp_comments
FOR SELECT USING (
  user_id = auth.uid() OR is_admin_or_officer(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.pdp_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid())
);

-- PDP Resources
CREATE TABLE public.pdp_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_url TEXT,
  file_type TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdp_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Officers can manage pdp resources" ON public.pdp_resources
FOR ALL USING (is_admin_or_officer(auth.uid()));

CREATE POLICY "All authenticated users can view pdp resources" ON public.pdp_resources
FOR SELECT USING (true);

CREATE TRIGGER update_pdp_resources_updated_at
BEFORE UPDATE ON public.pdp_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for PDP submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('pdp-submissions', 'pdp-submissions', false);

CREATE POLICY "Users can upload pdp files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'pdp-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own pdp files" ON storage.objects
FOR SELECT USING (bucket_id = 'pdp-submissions' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin_or_officer(auth.uid())));
