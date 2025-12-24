-- Create table for tracking ready members during EOP voting
CREATE TABLE public.eop_ready (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.eop_candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, user_id)
);

-- Enable RLS
ALTER TABLE public.eop_ready ENABLE ROW LEVEL SECURITY;

-- All authenticated users can insert their own ready status
CREATE POLICY "Users can mark themselves ready"
ON public.eop_ready
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can delete their own ready status
CREATE POLICY "Users can unmark themselves ready"
ON public.eop_ready
FOR DELETE
USING (auth.uid() = user_id);

-- All authenticated users can view ready statuses
CREATE POLICY "Users can view ready statuses"
ON public.eop_ready
FOR SELECT
USING (true);

-- Enable realtime for eop_candidates
ALTER PUBLICATION supabase_realtime ADD TABLE public.eop_candidates;

-- Enable realtime for eop_votes  
ALTER PUBLICATION supabase_realtime ADD TABLE public.eop_votes;

-- Enable realtime for eop_ready
ALTER PUBLICATION supabase_realtime ADD TABLE public.eop_ready;