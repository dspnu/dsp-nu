-- Live voting efficiency: cast/tally/ready RPCs, replica identity, officer aggregates

-- ---------------------------------------------------------------------------
-- Replica identity for correct DELETE/UPDATE payloads on Realtime (officers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.eop_votes REPLICA IDENTITY FULL;
ALTER TABLE public.election_votes REPLICA IDENTITY FULL;
ALTER TABLE public.eop_ready REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- Cast EOP vote (single round-trip; unique conflict = already voted)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_eop_vote(
  p_candidate_id uuid,
  p_vote public.eop_vote
)
RETURNS public.eop_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.eop_votes;
  v_open boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT voting_open INTO v_open
  FROM public.eop_candidates
  WHERE id = p_candidate_id;

  IF v_open IS NOT TRUE THEN
    RAISE EXCEPTION 'Voting is not open for this candidate';
  END IF;

  INSERT INTO public.eop_votes (voter_id, candidate_id, vote)
  VALUES (v_uid, p_candidate_id, p_vote)
  ON CONFLICT (candidate_id, voter_id) DO NOTHING
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You have already voted for this candidate'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_eop_vote(uuid, public.eop_vote) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_eop_vote(uuid, public.eop_vote) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cast / change election vote (upsert)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_election_vote(
  p_position_id uuid,
  p_candidate_id uuid
)
RETURNS public.election_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.election_votes;
  v_ok boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.election_positions ep
    JOIN public.elections e ON e.id = ep.election_id
    JOIN public.election_candidates ec ON ec.position_id = ep.id
    WHERE ep.id = p_position_id
      AND ep.is_active = true
      AND e.status = 'open'
      AND ec.id = p_candidate_id
  ) INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'Position is not open for voting or candidate is invalid';
  END IF;

  INSERT INTO public.election_votes (position_id, candidate_id, voter_id)
  VALUES (p_position_id, p_candidate_id, v_uid)
  ON CONFLICT (position_id, voter_id)
  DO UPDATE SET candidate_id = EXCLUDED.candidate_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_election_vote(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_election_vote(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- EOP vote tallies (officers only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_eop_vote_counts(p_candidate_id uuid DEFAULT NULL)
RETURNS TABLE (
  candidate_id uuid,
  yes bigint,
  no bigint,
  abstain bigint,
  total bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    v.candidate_id,
    COUNT(*) FILTER (WHERE v.vote = 'yes')::bigint,
    COUNT(*) FILTER (WHERE v.vote = 'no')::bigint,
    COUNT(*) FILTER (WHERE v.vote = 'abstain')::bigint,
    COUNT(*)::bigint
  FROM public.eop_votes v
  WHERE p_candidate_id IS NULL OR v.candidate_id = p_candidate_id
  GROUP BY v.candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_eop_vote_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eop_vote_counts(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Election tallies + turnout (officers only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_election_vote_counts(p_position_ids uuid[])
RETURNS TABLE (
  position_id uuid,
  candidate_id uuid,
  vote_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_position_ids IS NULL OR array_length(p_position_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.position_id,
    v.candidate_id,
    COUNT(*)::bigint
  FROM public.election_votes v
  WHERE v.position_id = ANY (p_position_ids)
  GROUP BY v.position_id, v.candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_election_vote_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_election_vote_counts(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_election_unique_voters(p_position_ids uuid[])
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_position_ids IS NULL OR array_length(p_position_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(DISTINCT v.voter_id)::bigint
    FROM public.election_votes v
    WHERE v.position_id = ANY (p_position_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_election_unique_voters(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_election_unique_voters(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ready count (no user id list fanout)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_eop_ready_status(p_candidate_id uuid)
RETURNS TABLE (
  ready_count bigint,
  i_am_ready boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::bigint FROM public.eop_ready r WHERE r.candidate_id = p_candidate_id),
    EXISTS (
      SELECT 1
      FROM public.eop_ready r2
      WHERE r2.candidate_id = p_candidate_id
        AND r2.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_eop_ready_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eop_ready_status(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Officer dashboard aggregates (avoid full ledger downloads)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_points_breakdown()
RETURNS TABLE (
  user_id uuid,
  category text,
  points bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    pl.user_id,
    pl.category::text,
    SUM(pl.points)::bigint
  FROM public.points_ledger pl
  GROUP BY pl.user_id, pl.category;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_points_breakdown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_points_breakdown() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_service_hours_totals()
RETURNS TABLE (
  user_id uuid,
  verified_hours numeric,
  total_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    sh.user_id,
    COALESCE(SUM(sh.hours) FILTER (WHERE sh.verified), 0)::numeric,
    COALESCE(SUM(sh.hours), 0)::numeric
  FROM public.service_hours sh
  GROUP BY sh.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_hours_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_hours_totals() TO authenticated;
