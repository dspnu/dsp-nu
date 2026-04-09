-- Brotherhood ticketed events: schema, RLS, and RPCs for claims, check-in, and notifications

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticketed_events_capacity_nonneg CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT ticketed_events_price_nonneg CHECK (price_cents >= 0)
);

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_tickets_payment_status_chk CHECK (
    payment_status IN ('not_required', 'pending', 'paid', 'waived')
  )
);

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
ON public.ticketed_events
FOR SELECT
TO authenticated
USING (
  published = true
  OR public.is_admin_or_officer(auth.uid())
);

CREATE POLICY "ticketed_events_officer_all"
ON public.ticketed_events
FOR ALL
TO authenticated
USING (public.is_admin_or_officer(auth.uid()))
WITH CHECK (public.is_admin_or_officer(auth.uid()));

CREATE POLICY "event_tickets_select_own_or_officer"
ON public.event_tickets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_or_officer(auth.uid())
);

CREATE POLICY "event_tickets_officer_update"
ON public.event_tickets
FOR UPDATE
TO authenticated
USING (public.is_admin_or_officer(auth.uid()))
WITH CHECK (public.is_admin_or_officer(auth.uid()));

-- Claim / assign / check-in / cancel (SECURITY DEFINER)

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = p_ticketed_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  IF NOT v_event.published OR NOT v_event.registrations_open THEN
    RETURN jsonb_build_object('ok', false, 'error', 'registration_closed');
  END IF;

  IF v_event.ends_at IS NOT NULL AND v_event.ends_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_ended');
  END IF;

  SELECT id INTO v_existing FROM public.event_tickets
  WHERE ticketed_event_id = p_ticketed_event_id
    AND user_id = auth.uid()
    AND cancelled_at IS NULL;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_registered');
  END IF;

  IF v_event.capacity IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_count FROM public.event_tickets
    WHERE ticketed_event_id = p_ticketed_event_id
      AND cancelled_at IS NULL;
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
    CASE
      WHEN v_event.price_cents > 0 THEN 'Ticket reserved: ' || v_event.title
      ELSE 'You''re in: ' || v_event.title
    END,
    CASE
      WHEN v_event.price_cents > 0 THEN
        'Complete payment using the link on your ticket. You''ll get a QR code after payment is recorded.'
      ELSE
        'Your ticket is confirmed. Open Tickets → My Tickets for your QR code and event details.'
    END,
    'ticket_confirmation',
    '/tickets?tab=my',
    p_ticketed_event_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'ticket_id', v_ticket_id,
    'check_in_code', v_code,
    'payment_status', v_pay
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_ticketed_event_ticket(
  p_ticketed_event_id uuid,
  p_user_id uuid,
  p_waive_payment boolean DEFAULT false
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
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = p_ticketed_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  SELECT id INTO v_existing FROM public.event_tickets
  WHERE ticketed_event_id = p_ticketed_event_id
    AND user_id = p_user_id
    AND cancelled_at IS NULL;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_registered');
  END IF;

  IF v_event.capacity IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_count FROM public.event_tickets
    WHERE ticketed_event_id = p_ticketed_event_id
      AND cancelled_at IS NULL;
    IF v_count >= v_event.capacity THEN
      RETURN jsonb_build_object('ok', false, 'error', 'sold_out');
    END IF;
  END IF;

  v_pay := CASE
    WHEN v_event.price_cents = 0 THEN 'not_required'
    WHEN p_waive_payment THEN 'waived'
    ELSE 'pending'
  END;

  INSERT INTO public.event_tickets (
    ticketed_event_id,
    user_id,
    payment_status,
    assigned_by
  )
  VALUES (
    p_ticketed_event_id,
    p_user_id,
    v_pay,
    auth.uid()
  )
  RETURNING id, check_in_code INTO v_ticket_id, v_code;

  INSERT INTO public.notifications (user_id, title, message, type, link, ticketed_event_id)
  VALUES (
    p_user_id,
    'Ticket issued: ' || v_event.title,
    'You have been assigned a ticket for this brotherhood event. Open Tickets for details.',
    'ticket_assigned',
    '/tickets?tab=my',
    p_ticketed_event_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'ticket_id', v_ticket_id,
    'check_in_code', v_code,
    'payment_status', v_pay
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_own_event_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.event_tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.event_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_row.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_cancelled');
  END IF;

  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in');
  END IF;

  UPDATE public.event_tickets
  SET cancelled_at = now()
  WHERE id = p_ticket_id;

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
  IF NOT public.is_admin_or_officer(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_norm := trim(p_code);
  IF length(v_norm) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT t.* INTO v_row
  FROM public.event_tickets t
  WHERE t.check_in_code = v_norm
    AND t.cancelled_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ticket_not_found');
  END IF;

  SELECT * INTO v_event FROM public.ticketed_events WHERE id = v_row.ticketed_event_id;

  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_checked_in',
      'ticket_id', v_row.id,
      'checked_in_at', v_row.checked_in_at,
      'event_title', v_event.title,
      'user_id', v_row.user_id
    );
  END IF;

  IF v_event.price_cents > 0
     AND v_row.payment_status NOT IN ('paid', 'waived') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'payment_pending',
      'ticket_id', v_row.id,
      'event_title', v_event.title,
      'user_id', v_row.user_id
    );
  END IF;

  UPDATE public.event_tickets
  SET checked_in_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'ticket_id', v_row.id,
    'checked_in_at', now(),
    'event_title', v_event.title,
    'user_id', v_row.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_holders_ticketed_event_updated(
  p_ticketed_event_id uuid,
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

  INSERT INTO public.notifications (user_id, title, message, type, link, ticketed_event_id)
  SELECT
    t.user_id,
    trim(p_title),
    trim(p_message),
    'ticket_event_update',
    '/tickets?tab=my',
    p_ticketed_event_id
  FROM public.event_tickets t
  LEFT JOIN public.notification_preferences np ON np.user_id = t.user_id
  WHERE t.ticketed_event_id = p_ticketed_event_id
    AND t.cancelled_at IS NULL
    AND COALESCE(np.event_notifications, true) = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ticketed_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_ticketed_event_ticket(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_own_event_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_ticket_holders_ticketed_event_updated(uuid, text, text) TO authenticated;
