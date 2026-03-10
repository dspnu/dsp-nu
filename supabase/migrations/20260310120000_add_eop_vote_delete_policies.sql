-- Allow members to delete their own EOP votes (used when changing a vote)
CREATE POLICY "Users can delete own votes"
ON public.eop_votes
FOR DELETE
TO authenticated
USING (voter_id = auth.uid());

-- Allow officers/admins to clear votes for a candidate (used by VP reset)
CREATE POLICY "Admin/Officers can delete votes"
ON public.eop_votes
FOR DELETE
TO authenticated
USING (public.is_admin_or_officer(auth.uid()));
