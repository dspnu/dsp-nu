-- PostgREST returns 404 (PGRST202) if the schema cache is stale or EXECUTE is missing for API roles.
-- Return json instead of void for a normal JSON body on success.
-- Return type change requires DROP (CREATE OR REPLACE cannot change the return type).

DROP FUNCTION IF EXISTS public.delete_user_account();

CREATE FUNCTION public.delete_user_account()
RETURNS json
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

  IF _profile_id IS NOT NULL THEN
    UPDATE public.profiles SET big = NULL WHERE big = _profile_id::text;
    UPDATE public.profiles SET little = NULL WHERE little = _profile_id::text;
  END IF;

  DELETE FROM public.notification_preferences WHERE user_id = _uid;
  DELETE FROM public.notifications WHERE user_id = _uid;
  DELETE FROM public.attendance_earner_completions WHERE user_id = _uid;
  DELETE FROM public.attendance WHERE user_id = _uid;
  DELETE FROM public.coffee_chats WHERE initiator_id = _uid OR partner_id = _uid;
  DELETE FROM public.dues_payments WHERE user_id = _uid;
  DELETE FROM public.event_rsvps WHERE user_id = _uid;
  DELETE FROM public.job_bookmarks WHERE user_id = _uid;
  DELETE FROM public.paddle_submissions WHERE user_id = _uid;
  DELETE FROM public.pdp_comments WHERE user_id = _uid;
  DELETE FROM public.pdp_submissions WHERE user_id = _uid;
  DELETE FROM public.points_ledger WHERE user_id = _uid;
  DELETE FROM public.service_hours WHERE user_id = _uid;
  DELETE FROM public.eop_ready WHERE user_id = _uid;
  DELETE FROM public.eop_votes WHERE voter_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE user_id = _uid;

  UPDATE public.coffee_chats SET confirmed_by = NULL WHERE confirmed_by = _uid;
  UPDATE public.audit_logs SET performed_by = NULL WHERE performed_by = _uid;
  UPDATE public.dues_payments SET created_by = NULL WHERE created_by = _uid;
  UPDATE public.events SET organizer_id = NULL WHERE organizer_id = _uid;
  UPDATE public.attendance SET checked_in_by = NULL WHERE checked_in_by = _uid;
  UPDATE public.points_ledger SET granted_by = NULL WHERE granted_by = _uid;
  UPDATE public.job_posts SET posted_by = NULL WHERE posted_by = _uid;
  UPDATE public.resources SET uploaded_by = NULL WHERE uploaded_by = _uid;
  UPDATE public.attendance_earners SET created_by = NULL WHERE created_by = _uid;
  UPDATE public.attendance_earner_completions SET granted_by = NULL WHERE granted_by = _uid;

  DELETE FROM auth.users WHERE id = _uid;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO service_role;

NOTIFY pgrst, 'reload schema';
