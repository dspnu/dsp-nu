
ALTER TABLE public.election_positions ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Allow voters to update their own votes (for re-voting)
CREATE POLICY "Users can update own votes" ON public.election_votes FOR UPDATE TO authenticated USING (voter_id = auth.uid());
