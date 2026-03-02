
-- Create pdp_modules table
CREATE TABLE public.pdp_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pdp_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Officers can manage pdp modules"
  ON public.pdp_modules FOR ALL
  USING (is_admin_or_officer(auth.uid()));

CREATE POLICY "All authenticated users can view pdp modules"
  ON public.pdp_modules FOR SELECT
  USING (true);

CREATE TRIGGER update_pdp_modules_updated_at
  BEFORE UPDATE ON public.pdp_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add module_id to pdp_assignments
ALTER TABLE public.pdp_assignments
  ADD COLUMN module_id UUID REFERENCES public.pdp_modules(id) ON DELETE SET NULL;

-- Add module_id to pdp_resources
ALTER TABLE public.pdp_resources
  ADD COLUMN module_id UUID REFERENCES public.pdp_modules(id) ON DELETE SET NULL;
