-- Atomic apply for Clover Hosted Checkout success (idempotent; called from Edge Function with service role).

CREATE OR REPLACE FUNCTION public.apply_clover_checkout_success(
  p_checkout_session_id text,
  p_clover_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.clover_checkouts%ROWTYPE;
  v_amount_dollars numeric;
  v_ticket_paid boolean;
  v_upd int;
BEGIN
  IF p_checkout_session_id IS NULL OR length(trim(p_checkout_session_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_checkout_session_id');
  END IF;
  IF p_clover_payment_id IS NULL OR length(trim(p_clover_payment_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_payment_id');
  END IF;

  SELECT * INTO v_row
  FROM public.clover_checkouts
  WHERE checkout_session_id = p_checkout_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'checkout_not_found');
  END IF;

  IF v_row.status = 'completed' THEN
    IF v_row.clover_payment_id IS NOT DISTINCT FROM p_clover_payment_id THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'already_completed_other_payment');
  END IF;

  v_amount_dollars := round(v_row.amount_cents::numeric / 100, 2);

  IF v_row.purpose IN ('dues', 'generic') THEN
    IF v_row.semester IS NULL OR length(trim(v_row.semester)) = 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dues_missing_semester');
    END IF;

    INSERT INTO public.dues_line_items (user_id, semester, type, amount, description, created_by)
    VALUES (
      v_row.user_id,
      v_row.semester,
      'payment',
      v_amount_dollars,
      'Clover payment ' || p_clover_payment_id,
      v_row.created_by
    );
  ELSIF v_row.purpose = 'ticket' THEN
    IF v_row.event_ticket_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'ticket_checkout_missing_event_ticket_id');
    END IF;

    UPDATE public.event_tickets t
    SET payment_status = 'paid', updated_at = now()
    WHERE t.id = v_row.event_ticket_id
      AND t.user_id = v_row.user_id
      AND t.cancelled_at IS NULL
      AND t.payment_status = 'pending';

    GET DIAGNOSTICS v_upd = ROW_COUNT;
    IF v_upd = 0 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.event_tickets et
        WHERE et.id = v_row.event_ticket_id
          AND et.payment_status = 'paid'
      ) INTO v_ticket_paid;
      IF NOT coalesce(v_ticket_paid, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ticket_not_pending');
      END IF;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_purpose');
  END IF;

  UPDATE public.clover_checkouts
  SET status = 'completed',
      clover_payment_id = p_clover_payment_id,
      updated_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_clover_checkout_failed(p_checkout_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_checkout_session_id IS NULL OR length(trim(p_checkout_session_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_checkout_session_id');
  END IF;

  UPDATE public.clover_checkouts
  SET status = 'failed', updated_at = now()
  WHERE checkout_session_id = p_checkout_session_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_updated > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_clover_checkout_success(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_clover_checkout_success(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_clover_checkout_failed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_clover_checkout_failed(text) TO service_role;
