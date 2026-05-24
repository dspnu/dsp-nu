
-- Career Hub: AI credit tracking + run history

CREATE TABLE public.career_credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_career_credit_usage_user_week ON public.career_credit_usage(user_id, week_start);
ALTER TABLE public.career_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit usage"
  ON public.career_credit_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_officer(auth.uid()));

-- inserts done server-side via service role

CREATE TABLE public.career_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 1 CHECK (amount > 0),
  remaining integer NOT NULL DEFAULT 1 CHECK (remaining >= 0),
  reason text,
  granted_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_career_credit_grants_user ON public.career_credit_grants(user_id);
ALTER TABLE public.career_credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grants"
  ON public.career_credit_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_officer(auth.uid()));

CREATE POLICY "Officers manage grants"
  ON public.career_credit_grants FOR ALL TO authenticated
  USING (public.is_admin_or_officer(auth.uid()))
  WITH CHECK (public.is_admin_or_officer(auth.uid()));

CREATE TABLE public.career_ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  title text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output text NOT NULL DEFAULT '',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_career_ai_runs_user_tool ON public.career_ai_runs(user_id, tool, created_at DESC);
ALTER TABLE public.career_ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own runs"
  ON public.career_ai_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own runs"
  ON public.career_ai_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own runs"
  ON public.career_ai_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own runs"
  ON public.career_ai_runs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Helper function: returns current week balance for a user
CREATE OR REPLACE FUNCTION public.get_career_credit_balance(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monday date := (date_trunc('week', (now() at time zone 'UTC')::date))::date;
  v_used int;
  v_grant_remaining int;
BEGIN
  SELECT COUNT(*)::int INTO v_used
  FROM public.career_credit_usage
  WHERE user_id = _user_id AND week_start = v_monday;

  SELECT COALESCE(SUM(remaining), 0)::int INTO v_grant_remaining
  FROM public.career_credit_grants
  WHERE user_id = _user_id
    AND remaining > 0
    AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'week_start', v_monday,
    'weekly_used', v_used,
    'weekly_remaining', GREATEST(0, 1 - v_used),
    'bonus_remaining', v_grant_remaining,
    'total_remaining', GREATEST(0, 1 - v_used) + v_grant_remaining,
    'next_reset', v_monday + 7
  );
END;
$$;
