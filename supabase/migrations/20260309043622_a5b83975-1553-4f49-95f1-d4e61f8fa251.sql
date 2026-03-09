-- Create attendance_earners table for point opportunities not tied to events
CREATE TABLE public.attendance_earners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category event_category NOT NULL DEFAULT 'chapter',
  points_value INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_earners ENABLE ROW LEVEL SECURITY;

-- Admin/Officers can manage attendance earners
CREATE POLICY "Admin/Officers can manage attendance earners"
ON public.attendance_earners FOR ALL
TO authenticated
USING (is_admin_or_officer(auth.uid()));

-- All authenticated users can view active attendance earners
CREATE POLICY "All authenticated can view attendance earners"
ON public.attendance_earners FOR SELECT
TO authenticated
USING (true);

-- Create table to track which members have earned points from attendance earners
CREATE TABLE public.attendance_earner_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  earner_id UUID NOT NULL REFERENCES public.attendance_earners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(earner_id, user_id)
);

-- Enable RLS
ALTER TABLE public.attendance_earner_completions ENABLE ROW LEVEL SECURITY;

-- Admin/Officers can manage completions
CREATE POLICY "Admin/Officers can manage completions"
ON public.attendance_earner_completions FOR ALL
TO authenticated
USING (is_admin_or_officer(auth.uid()));

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
ON public.attendance_earner_completions FOR SELECT
TO authenticated
USING (user_id = auth.uid());