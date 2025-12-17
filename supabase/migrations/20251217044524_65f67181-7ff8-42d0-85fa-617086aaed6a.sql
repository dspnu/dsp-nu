-- Add new fields to eop_candidates for PNM scoring
ALTER TABLE public.eop_candidates 
ADD COLUMN IF NOT EXISTS picture_url text,
ADD COLUMN IF NOT EXISTS video_score integer,
ADD COLUMN IF NOT EXISTS interview_score integer,
ADD COLUMN IF NOT EXISTS r1_pu text,
ADD COLUMN IF NOT EXISTS r2_pu text,
ADD COLUMN IF NOT EXISTS tu_td integer DEFAULT 0;

-- Create service_hours table
CREATE TABLE public.service_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hours numeric NOT NULL,
  description text NOT NULL,
  service_date date NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on service_hours
ALTER TABLE public.service_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_hours
CREATE POLICY "Users can view own service hours" 
ON public.service_hours 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admin/Officers can view all service hours" 
ON public.service_hours 
FOR SELECT 
USING (is_admin_or_officer(auth.uid()));

CREATE POLICY "Users can log service hours" 
ON public.service_hours 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin/Officers can manage service hours" 
ON public.service_hours 
FOR ALL 
USING (is_admin_or_officer(auth.uid()));

-- Trigger for updated_at on service_hours
CREATE TRIGGER update_service_hours_updated_at
BEFORE UPDATE ON public.service_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create pnm_pictures storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pnm-pictures', 'pnm-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pnm pictures
CREATE POLICY "PNM pictures are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pnm-pictures');

CREATE POLICY "Admin/Officers can upload PNM pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pnm-pictures' AND is_admin_or_officer(auth.uid()));

CREATE POLICY "Admin/Officers can update PNM pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pnm-pictures' AND is_admin_or_officer(auth.uid()));

CREATE POLICY "Admin/Officers can delete PNM pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pnm-pictures' AND is_admin_or_officer(auth.uid()));