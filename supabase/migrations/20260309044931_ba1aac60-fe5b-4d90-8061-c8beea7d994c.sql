
ALTER TABLE public.eop_candidates 
  ADD COLUMN IF NOT EXISTS video_graded_by text,
  ADD COLUMN IF NOT EXISTS interview_graded_by text,
  ADD COLUMN IF NOT EXISTS absent_members text[] DEFAULT '{}'::text[];
