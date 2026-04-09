-- President-admin data export purge function.
-- Deletes selected datasets within a date window after explicit admin confirmation in the UI.

CREATE OR REPLACE FUNCTION public.purge_exported_data(
  p_from date,
  p_to date,
  p_datasets text[]
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = v_uid
      AND COALESCE(p.positions, ARRAY[]::text[]) @> ARRAY['President']::text[]
  )
  INTO v_is_president;

  IF NOT (v_is_president OR public.is_admin_or_officer(v_uid)) THEN
    RAISE EXCEPTION 'Not authorized to purge';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  IF p_datasets IS NULL OR array_length(p_datasets, 1) IS NULL THEN
    RAISE EXCEPTION 'No datasets selected';
  END IF;

  FOREACH v_name IN ARRAY p_datasets LOOP
    v_deleted := 0;

    -- IMPORTANT: keep these deletes narrowly scoped by date window.
    CASE v_name
      WHEN 'attendance' THEN
        DELETE FROM public.attendance
        WHERE checked_in_at >= v_from_ts AND checked_in_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'events' THEN
        DELETE FROM public.events
        WHERE start_time >= v_from_ts AND start_time < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'event_rsvps' THEN
        DELETE FROM public.event_rsvps
        WHERE updated_at >= v_from_ts AND updated_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'service_hours' THEN
        DELETE FROM public.service_hours
        WHERE service_date::timestamptz >= v_from_ts AND service_date::timestamptz < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'points_ledger' THEN
        DELETE FROM public.points_ledger
        WHERE created_at >= v_from_ts AND created_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'dues_payments' THEN
        DELETE FROM public.dues_payments
        WHERE paid_at >= v_from_ts AND paid_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'dues_line_items' THEN
        DELETE FROM public.dues_line_items
        WHERE created_at >= v_from_ts AND created_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'dues_installments' THEN
        DELETE FROM public.dues_installments
        WHERE created_at >= v_from_ts AND created_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'dues_late_fees' THEN
        DELETE FROM public.dues_late_fees
        WHERE created_at >= v_from_ts AND created_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'dues_config' THEN
        -- Config is normally small; do not delete by default window.
        v_deleted := 0;

      WHEN 'ticketed_events' THEN
        DELETE FROM public.ticketed_events
        WHERE starts_at >= v_from_ts AND starts_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'event_tickets' THEN
        DELETE FROM public.event_tickets
        WHERE created_at >= v_from_ts AND created_at < v_to_ts;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;

      WHEN 'audit_logs' THEN
        -- Never purge audit logs through this function.
        v_deleted := 0;

      WHEN 'profiles' THEN
        -- Never purge member profiles through this function.
        v_deleted := 0;

      ELSE
        -- Unknown dataset id: ignore (do not delete anything).
        v_deleted := 0;
    END CASE;

    v_counts := v_counts || jsonb_build_object(v_name, v_deleted);
  END LOOP;

  INSERT INTO public.audit_logs (action, table_name, performed_by, old_data, new_data, record_id)
  VALUES (
    'purge_exported_data',
    'multiple',
    v_uid,
    jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'datasets', p_datasets,
      'deleted_counts', v_counts
    ),
    NULL,
    NULL
  );

  RETURN v_counts::json;
END;
$$;

