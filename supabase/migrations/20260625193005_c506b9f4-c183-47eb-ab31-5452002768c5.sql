
CREATE OR REPLACE FUNCTION public.get_career_hub_usage_stats(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_authorized boolean;
  v_since timestamptz := now() - make_interval(days => GREATEST(p_days, 1));
  v_total_runs int;
  v_runs_in_period int;
  v_unique_users int;
  v_unique_users_period int;
  v_by_tool jsonb;
  v_by_day jsonb;
  v_top_users jsonb;
  v_week_start date := (date_trunc('week', (now() at time zone 'UTC')::date))::date;
  v_weekly_used int;
  v_bonus_outstanding int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT (
    public.is_admin_or_officer(v_uid)
    OR public.is_chapter_president(v_uid)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = v_uid
        AND 'VP of Professional Activities' = ANY(COALESCE(p.positions, '{}'::text[]))
    )
  ) INTO v_authorized;

  IF NOT v_authorized THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT COUNT(*) INTO v_total_runs FROM public.career_ai_runs;
  SELECT COUNT(*) INTO v_runs_in_period FROM public.career_ai_runs WHERE created_at >= v_since;
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users FROM public.career_ai_runs;
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users_period FROM public.career_ai_runs WHERE created_at >= v_since;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('tool', tool, 'count', c) ORDER BY c DESC), '[]'::jsonb)
  INTO v_by_tool
  FROM (
    SELECT tool, COUNT(*)::int AS c
    FROM public.career_ai_runs
    WHERE created_at >= v_since
    GROUP BY tool
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb)
  INTO v_by_day
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS c
    FROM public.career_ai_runs
    WHERE created_at >= v_since
    GROUP BY 1
  ) d;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'first_name', first_name,
    'last_name', last_name,
    'count', c
  ) ORDER BY c DESC), '[]'::jsonb)
  INTO v_top_users
  FROM (
    SELECT r.user_id, p.first_name, p.last_name, COUNT(*)::int AS c
    FROM public.career_ai_runs r
    LEFT JOIN public.profiles p ON p.user_id = r.user_id
    WHERE r.created_at >= v_since
    GROUP BY r.user_id, p.first_name, p.last_name
    ORDER BY c DESC
    LIMIT 10
  ) u;

  SELECT COUNT(*) INTO v_weekly_used FROM public.career_credit_usage WHERE week_start = v_week_start;
  SELECT COALESCE(SUM(remaining), 0)::int INTO v_bonus_outstanding
  FROM public.career_credit_grants
  WHERE remaining > 0 AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'period_days', p_days,
    'total_runs', v_total_runs,
    'runs_in_period', v_runs_in_period,
    'unique_users', v_unique_users,
    'unique_users_in_period', v_unique_users_period,
    'by_tool', v_by_tool,
    'by_day', v_by_day,
    'top_users', v_top_users,
    'week_start', v_week_start,
    'weekly_credits_used', v_weekly_used,
    'bonus_credits_outstanding', v_bonus_outstanding
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_career_hub_usage_stats(int) TO authenticated;
