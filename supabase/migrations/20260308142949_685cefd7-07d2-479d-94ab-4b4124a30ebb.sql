
-- Create paddle_submissions table
CREATE TABLE public.paddle_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  link_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paddle_submissions ENABLE ROW LEVEL SECURITY;

-- Members can submit
CREATE POLICY "Users can submit paddles"
  ON public.paddle_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Members can view own
CREATE POLICY "Users can view own paddle submissions"
  ON public.paddle_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin/Officers can view all
CREATE POLICY "Admin/Officers can view all paddle submissions"
  ON public.paddle_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin_or_officer(auth.uid()));

-- Admin/Officers can delete
CREATE POLICY "Admin/Officers can delete paddle submissions"
  ON public.paddle_submissions
  FOR DELETE
  TO authenticated
  USING (is_admin_or_officer(auth.uid()));

-- Insert the chapter setting for paddle visibility
INSERT INTO public.chapter_settings (key, value)
VALUES ('paddle_submissions_visible', 'false'::jsonb)
ON CONFLICT DO NOTHING;
