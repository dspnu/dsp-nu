
CREATE TABLE public.career_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolver_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_help_requests TO authenticated;
GRANT ALL ON public.career_help_requests TO service_role;

ALTER TABLE public.career_help_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_professionalism_helper(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin_or_officer(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND (
          'VP of Professional Activities' = ANY(COALESCE(p.positions, '{}'::text[]))
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(p.positions, '{}'::text[])) pos
            WHERE pos ILIKE '%professionalism%'
          )
        )
    );
$$;

CREATE POLICY "own_or_helper_select" ON public.career_help_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_professionalism_helper(auth.uid()));

CREATE POLICY "own_insert" ON public.career_help_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "helper_update" ON public.career_help_requests
  FOR UPDATE TO authenticated
  USING (public.is_professionalism_helper(auth.uid()))
  WITH CHECK (public.is_professionalism_helper(auth.uid()));

CREATE POLICY "own_or_helper_delete" ON public.career_help_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_professionalism_helper(auth.uid()));

CREATE TRIGGER trg_career_help_updated_at
  BEFORE UPDATE ON public.career_help_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_career_help(
  p_tool text,
  p_subject text,
  p_message text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_requester_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(trim(coalesce(p_subject,''))) = 0 OR length(trim(coalesce(p_message,''))) = 0 THEN
    RAISE EXCEPTION 'subject and message are required';
  END IF;

  INSERT INTO public.career_help_requests (user_id, tool, subject, message)
  VALUES (v_uid, NULLIF(trim(p_tool),''), trim(p_subject), trim(p_message))
  RETURNING id INTO v_id;

  SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    INTO v_requester_name
  FROM public.profiles WHERE user_id = v_uid;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT p.user_id,
    'Career help request',
    coalesce(nullif(v_requester_name,''),'A member') || ' asked for help: ' || trim(p_subject),
    'career_help_request',
    '/career?tab=requests'
  FROM public.profiles p
  WHERE 'VP of Professional Activities' = ANY(COALESCE(p.positions, '{}'::text[]))
     OR EXISTS (
       SELECT 1 FROM unnest(COALESCE(p.positions,'{}'::text[])) pos
       WHERE pos ILIKE '%professionalism%'
     );

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_career_help(text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_career_help(text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_professionalism_helper(uuid) FROM anon;
