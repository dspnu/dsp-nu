
-- Election status enum
CREATE TYPE public.election_status AS ENUM ('draft', 'open', 'closed');

-- Elections table
CREATE TABLE public.elections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status public.election_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Election positions (e.g. "President", "VP Finance")
CREATE TABLE public.election_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  position_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Election candidates per position
CREATE TABLE public.election_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.election_positions(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Election votes (one vote per voter per position)
CREATE TABLE public.election_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.election_positions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.election_candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(position_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_votes ENABLE ROW LEVEL SECURITY;

-- Elections policies
CREATE POLICY "Admin/Officers can manage elections" ON public.elections FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "All authenticated can view elections" ON public.elections FOR SELECT USING (true);

-- Positions policies
CREATE POLICY "Admin/Officers can manage election positions" ON public.election_positions FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "All authenticated can view election positions" ON public.election_positions FOR SELECT USING (true);

-- Candidates policies
CREATE POLICY "Admin/Officers can manage election candidates" ON public.election_candidates FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "All authenticated can view election candidates" ON public.election_candidates FOR SELECT USING (true);

-- Votes policies
CREATE POLICY "Users can cast votes" ON public.election_votes FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Users can view own votes" ON public.election_votes FOR SELECT USING (voter_id = auth.uid());
CREATE POLICY "Admin/Officers can view all votes" ON public.election_votes FOR SELECT USING (is_admin_or_officer(auth.uid()));

-- Updated_at trigger for elections
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
