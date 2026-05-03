
-- 1. delete_user_account
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

  IF _profile_id IS NOT NULL THEN
    UPDATE public.profiles SET big = NULL WHERE big = _profile_id;
    UPDATE public.profiles SET little = NULL WHERE little = _profile_id;
  END IF;

  DELETE FROM public.notification_preferences WHERE user_id = _uid;
  DELETE FROM public.notifications WHERE user_id = _uid;
  DELETE FROM public.attendance_earner_completions WHERE user_id = _uid;
  DELETE FROM public.attendance WHERE user_id = _uid;
  DELETE FROM public.coffee_chats WHERE initiator_id = _uid OR partner_id = _uid;
  DELETE FROM public.dues_payments WHERE user_id = _uid;
  DELETE FROM public.dues_line_items WHERE user_id = _uid;
  DELETE FROM public.dues_installments WHERE user_id = _uid;
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

-- 2. Notification preferences: announcements + 24h reminder toggle
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS announcement_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_24h BOOLEAN NOT NULL DEFAULT true;

-- 3. notifications event_id
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_reminder_dedupe
  ON public.notifications (user_id, event_id)
  WHERE type = 'event_reminder' AND event_id IS NOT NULL;

-- Tighten insert policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users and officers can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin_or_officer(auth.uid())
);

-- 4. Notification RPCs
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

-- 5. broadcast_chapter_announcement with optional link
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

GRANT EXECUTE ON FUNCTION public.notify_members_new_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_event_rsvps_updated(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_chapter_announcement(text, text, text) TO authenticated;

-- 6. Data usage consent
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS data_usage_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_usage_consent_updated_at TIMESTAMPTZ;

-- 7. Ticketed events tables
CREATE TABLE public.ticketed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INTEGER,
  price_cents INTEGER NOT NULL DEFAULT 0,
  payment_url TEXT,
  payment_url_internal BOOLEAN NOT NULL DEFAULT false,
  registrations_open BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Use validation trigger instead of CHECK for capacity/price
CREATE OR REPLACE FUNCTION public.validate_ticketed_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity IS NOT NULL AND NEW.capacity <= 0 THEN
    RAISE EXCEPTION 'capacity must be positive';
  END IF;
  IF NEW.price_cents < 0 THEN
    RAISE EXCEPTION 'price_cents must be non-negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_ticketed_event_trigger
  BEFORE INSERT OR UPDATE ON public.ticketed_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_ticketed_event();

CREATE TABLE public.event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketed_event_id UUID NOT NULL REFERENCES public.ticketed_events (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  check_in_code TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') UNIQUE,
  checked_in_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  assigned_by UUID REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for payment_status
CREATE OR REPLACE FUNCTION public.validate_event_ticket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status NOT IN ('not_required', 'pending', 'paid', 'waived') THEN
    RAISE EXCEPTION 'invalid payment_status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_event_ticket_trigger
  BEFORE INSERT OR UPDATE ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_ticket();

CREATE UNIQUE INDEX event_tickets_one_active_per_user_event
  ON public.event_tickets (ticketed_event_id, user_id)
  WHERE cancelled_at IS NULL;

CREATE INDEX event_tickets_event_idx ON public.event_tickets (ticketed_event_id);
CREATE INDEX event_tickets_user_idx ON public.event_tickets (user_id);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS ticketed_event_id UUID REFERENCES public.ticketed_events (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_ticket_payment_reminder_dedupe
  ON public.notifications (user_id, ticketed_event_id)
  WHERE type = 'ticket_payment_reminder' AND ticketed_event_id IS NOT NULL;

CREATE TRIGGER update_ticketed_events_updated_at
  BEFORE UPDATE ON public.ticketed_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_tickets_updated_at
  BEFORE UPDATE ON public.event_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ticketed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticketed_events_select_members"
ON public.ticketed_events FOR SELECT TO authenticated
USING (published = true OR public.is_admin_or_officer(auth.uid()));

CREATE POLICY "ticketed_events_officer_all"
ON public.ticketed_events FOR ALL TO authenticated
USING (public.is_admin_or_officer(auth.uid()))
WITH CHECK (public.is_admin_or_officer(auth.uid()));

CREATE POLICY "event_tickets_select_own_or_officer"
ON public.event_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin_or_officer(auth.uid()));

CREATE POLICY "event_tickets_officer_update"
ON public.event_tickets FOR UPDATE TO authenticated
USING (public.is_admin_or_officer(auth.uid()))
WITH CHECK (public.is_admin_or_officer(auth.uid()));

-- Ticketing RPCs
CREATE OR REPLACE FUNCTION public.claim_ticketed_event_ticket(p_ticketed_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.ticketed_events%ROWTYPE;
  v_count INTEGER;
  v_existing UUID;
  v_ticket_id UUID;
  v_code TEXT;
  v_pay TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = p_ticketed_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'event_not_found'); END IF;

  IF NOT v_event.published OR NOT v_event.registrations_open THEN
    RETURN jsonb_build_object('ok', false, 'error', 'registration_closed');
  END IF;

  IF v_event.ends_at IS NOT NULL AND v_event.ends_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_ended');
  END IF;

  SELECT id INTO v_existing FROM public.event_tickets
  WHERE ticketed_event_id = p_ticketed_event_id AND user_id = auth.uid() AND cancelled_at IS NULL;
  IF FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'already_registered'); END IF;

  IF v_event.capacity IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_count FROM public.event_tickets
    WHERE ticketed_event_id = p_ticketed_event_id AND cancelled_at IS NULL;
    IF v_count >= v_event.capacity THEN
      RETURN jsonb_build_object('ok', false, 'error', 'sold_out');
    END IF;
  END IF;

  v_pay := CASE WHEN v_event.price_cents > 0 THEN 'pending' ELSE 'not_required' END;

  INSERT INTO public.event_tickets (ticketed_event_id, user_id, payment_status)
  VALUES (p_ticketed_event_id, auth.uid(), v_pay)
  RETURNING id, check_in_code INTO v_ticket_id, v_code;

  INSERT INTO public.notifications (user_id, title, message, type, link, ticketed_event_id)
  VALUES (
    auth.uid(),
    CASE WHEN v_event.price_cents > 0 THEN 'Ticket reserved: ' || v_event.title
         ELSE 'You''re in: ' || v_event.title END,
    CASE WHEN v_event.price_cents > 0 THEN 'Complete payment using the link on your ticket.'
         ELSE 'Your ticket is confirmed. Open Tickets for your QR code.' END,
    'ticket_confirmation', '/tickets?tab=my', p_ticketed_event_id
  );

  RETURN jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'check_in_code', v_code, 'payment_status', v_pay);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_ticketed_event_ticket(
  p_ticketed_event_id uuid, p_user_id uuid, p_waive_payment boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.ticketed_events%ROWTYPE;
  v_count INTEGER;
  v_existing UUID;
  v_ticket_id UUID;
  v_code TEXT;
  v_pay TEXT;
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = p_ticketed_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'event_not_found'); END IF;

  SELECT id INTO v_existing FROM public.event_tickets
  WHERE ticketed_event_id = p_ticketed_event_id AND user_id = p_user_id AND cancelled_at IS NULL;
  IF FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'already_registered'); END IF;

  IF v_event.capacity IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_count FROM public.event_tickets
    WHERE ticketed_event_id = p_ticketed_event_id AND cancelled_at IS NULL;
    IF v_count >= v_event.capacity THEN RETURN jsonb_build_object('ok', false, 'error', 'sold_out'); END IF;
  END IF;

  v_pay := CASE WHEN v_event.price_cents = 0 THEN 'not_required'
                WHEN p_waive_payment THEN 'waived' ELSE 'pending' END;

  INSERT INTO public.event_tickets (ticketed_event_id, user_id, payment_status, assigned_by)
  VALUES (p_ticketed_event_id, p_user_id, v_pay, auth.uid())
  RETURNING id, check_in_code INTO v_ticket_id, v_code;

  INSERT INTO public.notifications (user_id, title, message, type, link, ticketed_event_id)
  VALUES (p_user_id, 'Ticket issued: ' || v_event.title, 'You have been assigned a ticket.', 'ticket_assigned', '/tickets?tab=my', p_ticketed_event_id);

  RETURN jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'check_in_code', v_code, 'payment_status', v_pay);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_own_event_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.event_tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_row FROM public.event_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_row.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF v_row.cancelled_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'already_cancelled'); END IF;
  IF v_row.checked_in_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in'); END IF;
  UPDATE public.event_tickets SET cancelled_at = now() WHERE id = p_ticket_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_ticket_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.event_tickets%ROWTYPE;
  v_event public.ticketed_events%ROWTYPE;
  v_norm TEXT;
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  v_norm := trim(p_code);
  IF length(v_norm) < 8 THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_code'); END IF;

  SELECT t.* INTO v_row FROM public.event_tickets t WHERE t.check_in_code = v_norm AND t.cancelled_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'ticket_not_found'); END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = v_row.ticketed_event_id;

  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in', 'ticket_id', v_row.id, 'checked_in_at', v_row.checked_in_at, 'event_title', v_event.title, 'user_id', v_row.user_id);
  END IF;

  IF v_event.price_cents > 0 AND v_row.payment_status NOT IN ('paid', 'waived') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payment_pending', 'ticket_id', v_row.id, 'event_title', v_event.title, 'user_id', v_row.user_id);
  END IF;

  UPDATE public.event_tickets SET checked_in_at = now() WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true, 'ticket_id', v_row.id, 'checked_in_at', now(), 'event_title', v_event.title, 'user_id', v_row.user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_holders_ticketed_event_updated(
  p_ticketed_event_id uuid, p_title text, p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_officer(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link, ticketed_event_id)
  SELECT t.user_id, trim(p_title), trim(p_message), 'ticket_event_update', '/tickets?tab=my', p_ticketed_event_id
  FROM public.event_tickets t
  LEFT JOIN public.notification_preferences np ON np.user_id = t.user_id
  WHERE t.ticketed_event_id = p_ticketed_event_id AND t.cancelled_at IS NULL
    AND COALESCE(np.event_notifications, true) = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ticketed_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_ticketed_event_ticket(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_own_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_ticket_holders_ticketed_event_updated(uuid, text, text) TO authenticated;

-- 8. Purge exported data
CREATE OR REPLACE FUNCTION public.purge_exported_data(
  p_from date, p_to date, p_datasets text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_president boolean;
  v_from_ts timestamptz := (p_from::timestamptz);
  v_to_ts timestamptz := ((p_to + 1)::timestamptz);
  v_counts jsonb := '{}'::jsonb;
  v_name text;
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = v_uid AND COALESCE(p.positions, ARRAY[]::text[]) @> ARRAY['President']::text[]
  ) INTO v_is_president;

  IF NOT (v_is_president OR public.is_admin_or_officer(v_uid)) THEN
    RAISE EXCEPTION 'Not authorized to purge';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN RAISE EXCEPTION 'Invalid date range'; END IF;
  IF p_datasets IS NULL OR array_length(p_datasets, 1) IS NULL THEN RAISE EXCEPTION 'No datasets selected'; END IF;

  FOREACH v_name IN ARRAY p_datasets LOOP
    v_deleted := 0;
    CASE v_name
      WHEN 'attendance' THEN DELETE FROM public.attendance WHERE checked_in_at >= v_from_ts AND checked_in_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'events' THEN DELETE FROM public.events WHERE start_time >= v_from_ts AND start_time < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'event_rsvps' THEN DELETE FROM public.event_rsvps WHERE updated_at >= v_from_ts AND updated_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'service_hours' THEN DELETE FROM public.service_hours WHERE service_date::timestamptz >= v_from_ts AND service_date::timestamptz < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'points_ledger' THEN DELETE FROM public.points_ledger WHERE created_at >= v_from_ts AND created_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'dues_payments' THEN DELETE FROM public.dues_payments WHERE paid_at >= v_from_ts AND paid_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'dues_line_items' THEN DELETE FROM public.dues_line_items WHERE created_at >= v_from_ts AND created_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'dues_installments' THEN DELETE FROM public.dues_installments WHERE created_at >= v_from_ts AND created_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'dues_late_fees' THEN DELETE FROM public.dues_late_fees WHERE created_at >= v_from_ts AND created_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'dues_config' THEN v_deleted := 0;
      WHEN 'ticketed_events' THEN DELETE FROM public.ticketed_events WHERE starts_at >= v_from_ts AND starts_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'event_tickets' THEN DELETE FROM public.event_tickets WHERE created_at >= v_from_ts AND created_at < v_to_ts; GET DIAGNOSTICS v_deleted = ROW_COUNT;
      WHEN 'audit_logs' THEN v_deleted := 0;
      WHEN 'profiles' THEN v_deleted := 0;
      ELSE v_deleted := 0;
    END CASE;
    v_counts := v_counts || jsonb_build_object(v_name, v_deleted);
  END LOOP;

  INSERT INTO public.audit_logs (action, table_name, performed_by, old_data, new_data, record_id)
  VALUES ('purge_exported_data', 'multiple', v_uid, jsonb_build_object('from', p_from, 'to', p_to, 'datasets', p_datasets, 'deleted_counts', v_counts), NULL, NULL);

  RETURN v_counts::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_exported_data(date, date, text[]) TO authenticated;
