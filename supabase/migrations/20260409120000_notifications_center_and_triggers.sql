-- Notification preferences: announcements + 24h reminder toggle
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS announcement_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_24h BOOLEAN NOT NULL DEFAULT true;

-- Optional link to events for deduplication and navigation
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_reminder_dedupe
  ON public.notifications (user_id, event_id)
  WHERE type = 'event_reminder' AND event_id IS NOT NULL;

-- Tighten inserts: self, or chapter officers/admins (bulk PDP/event notifications)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users and officers can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin_or_officer(auth.uid())
);

-- Notify members about a newly created event (respects event_notifications; skips creator; exec-only visibility)
CREATE OR REPLACE FUNCTION public.notify_members_new_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, event_id)
  SELECT
    p.user_id,
    'New event: ' || e.title,
    COALESCE(
      NULLIF(trim(e.description), ''),
      'A new chapter event was added — open Events for details.'
    ),
    'new_event',
    '/events',
    e.id
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE p.user_id <> auth.uid()
    AND COALESCE(np.event_notifications, true) = true
    AND (
      e.category::text <> 'exec'
      OR cardinality(COALESCE(p.positions, '{}'::text[])) > 0
    );
END;
$$;

-- Notify RSVPs when event details change
CREATE OR REPLACE FUNCTION public.notify_event_rsvps_updated(
  p_event_id uuid,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, event_id)
  SELECT
    r.user_id,
    p_title,
    p_message,
    'event_update',
    '/events',
    p_event_id
  FROM public.event_rsvps r
  LEFT JOIN public.notification_preferences np ON np.user_id = r.user_id
  WHERE r.event_id = p_event_id
    AND r.response IN ('yes', 'maybe')
    AND COALESCE(np.event_notifications, true) = true;
END;
$$;

-- Chapter-wide announcement (officers only)
CREATE OR REPLACE FUNCTION public.broadcast_chapter_announcement(p_title text, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF length(trim(p_title)) = 0 OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'title and message are required';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT
    p.user_id,
    trim(p_title),
    trim(p_message),
    'announcement',
    '/notifications'
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE COALESCE(np.announcement_notifications, true) = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_members_new_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_event_rsvps_updated(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_chapter_announcement(text, text) TO authenticated;
