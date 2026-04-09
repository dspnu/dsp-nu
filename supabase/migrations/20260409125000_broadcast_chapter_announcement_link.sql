-- Optional link on chapter announcements; single 3-arg signature for PostgREST
DROP FUNCTION IF EXISTS public.broadcast_chapter_announcement(text, text);

CREATE OR REPLACE FUNCTION public.broadcast_chapter_announcement(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF length(trim(p_title)) = 0 OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'title and message are required';
  END IF;

  v_link := COALESCE(NULLIF(trim(p_link), ''), '/notifications');

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT
    p.user_id,
    trim(p_title),
    trim(p_message),
    'announcement',
    v_link
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE COALESCE(np.announcement_notifications, true) = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_chapter_announcement(text, text, text) TO authenticated;
