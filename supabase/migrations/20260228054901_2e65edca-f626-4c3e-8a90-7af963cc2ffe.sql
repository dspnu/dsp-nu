
-- Create a simple settings table for chapter-wide toggles
CREATE TABLE public.chapter_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapter_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "All authenticated users can view settings"
ON public.chapter_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admin/officers can manage settings
CREATE POLICY "Admin/Officers can manage settings"
ON public.chapter_settings
FOR ALL
TO authenticated
USING (is_admin_or_officer(auth.uid()));

-- Insert default EOP visibility setting
INSERT INTO public.chapter_settings (key, value) VALUES ('eop_visible', 'false'::jsonb);
