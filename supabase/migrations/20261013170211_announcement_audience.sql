-- Optional audience on chapter announcements. Null filters mean the whole chapter.
-- A non-null filter includes anyone who matches that list (combined with OR).

DROP FUNCTION IF EXISTS public.broadcast_chapter_announcement(text, text, text);

CREATE OR REPLACE FUNCTION public.broadcast_chapter_announcement(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_user_ids uuid[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_committees text[] DEFAULT NULL,
  p_pledge_classes text[] DEFAULT NULL,
  p_families text[] DEFAULT NULL,
  p_positions text[] DEFAULT NULL,
  p_roles text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_everyone boolean;
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF length(trim(p_title)) = 0 OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'title and message are required';
  END IF;

  IF COALESCE(cardinality(p_user_ids), 0) > 2000
    OR COALESCE(cardinality(p_statuses), 0) > 20
    OR COALESCE(cardinality(p_committees), 0) > 100
    OR COALESCE(cardinality(p_pledge_classes), 0) > 100
    OR COALESCE(cardinality(p_families), 0) > 100
    OR COALESCE(cardinality(p_positions), 0) > 100
    OR COALESCE(cardinality(p_roles), 0) > 20
  THEN
    RAISE EXCEPTION 'audience is too large';
  END IF;

  v_everyone :=
    p_user_ids IS NULL
    AND p_statuses IS NULL
    AND p_committees IS NULL
    AND p_pledge_classes IS NULL
    AND p_families IS NULL
    AND p_positions IS NULL
    AND p_roles IS NULL;

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
  WHERE COALESCE(np.announcement_notifications, true) = true
    AND (
      v_everyone
      OR (p_user_ids IS NOT NULL AND p.user_id = ANY (p_user_ids))
      OR (
        p_statuses IS NOT NULL
        AND p.status::text = ANY (p_statuses)
        AND p.status::text IN ('active', 'alumni', 'new_member', 'pnm', 'inactive')
      )
      OR (
        p_committees IS NOT NULL
        AND COALESCE(p.committees, '{}'::text[]) && p_committees
      )
      OR (
        p_pledge_classes IS NOT NULL
        AND p.pledge_class = ANY (p_pledge_classes)
      )
      OR (
        p_families IS NOT NULL
        AND p.family = ANY (p_families)
      )
      OR (
        p_positions IS NOT NULL
        AND COALESCE(p.positions, '{}'::text[]) && p_positions
      )
      OR (
        p_roles IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.user_id
            AND ur.role::text = ANY (p_roles)
            AND ur.role::text IN ('admin', 'officer', 'member', 'developer', 'president')
        )
      )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_chapter_announcement(text, text, text, uuid[], text[], text[], text[], text[], text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.broadcast_chapter_announcement(text, text, text, uuid[], text[], text[], text[], text[], text[], text[]) TO authenticated;
