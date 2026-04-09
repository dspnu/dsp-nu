CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO _profile_id FROM public.profiles WHERE user_id = _uid;

  -- Nullify big/little references from other profiles pointing to this user
  IF _profile_id IS NOT NULL THEN
    UPDATE public.profiles SET big = NULL WHERE big = _profile_id::text;
    UPDATE public.profiles SET little = NULL WHERE little = _profile_id::text;
  END IF;

  DELETE FROM public.notification_preferences WHERE user_id = _uid;
  DELETE FROM public.notifications WHERE user_id = _uid;
  DELETE FROM public.attendance_earner_completions WHERE user_id = _uid;
  DELETE FROM public.attendance WHERE user_id = _uid;
  DELETE FROM public.coffee_chats WHERE user_id = _uid;
  DELETE FROM public.dues_payments WHERE user_id = _uid;
  DELETE FROM public.event_rsvps WHERE user_id = _uid;
  DELETE FROM public.job_bookmarks WHERE user_id = _uid;
  DELETE FROM public.paddle_submissions WHERE user_id = _uid;
  DELETE FROM public.pdp_comments WHERE user_id = _uid;
  DELETE FROM public.pdp_submissions WHERE user_id = _uid;
  DELETE FROM public.points_ledger WHERE user_id = _uid;
  DELETE FROM public.service_hours WHERE user_id = _uid;
  DELETE FROM public.eop_ready WHERE user_id = _uid;
  DELETE FROM public.eop_votes WHERE user_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE user_id = _uid;

  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
