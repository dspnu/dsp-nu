
ALTER TABLE public.career_help_requests
  ADD COLUMN IF NOT EXISTS links text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage policies for career-help-attachments bucket
-- Path convention: {user_id}/{request_id_or_draft}/{filename}
CREATE POLICY "career_help_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'career-help-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_professionalism_helper(auth.uid())
    )
  );

CREATE POLICY "career_help_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'career-help-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "career_help_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'career-help-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_professionalism_helper(auth.uid())
    )
  );

-- Update RPC to accept links + attachments
CREATE OR REPLACE FUNCTION public.request_career_help(
  p_tool text,
  p_subject text,
  p_message text,
  p_links text[] DEFAULT '{}'::text[],
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_requester_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(trim(coalesce(p_subject,''))) = 0 OR length(trim(coalesce(p_message,''))) = 0 THEN
    RAISE EXCEPTION 'subject and message are required';
  END IF;

  INSERT INTO public.career_help_requests (user_id, tool, subject, message, links, attachments)
  VALUES (
    v_uid,
    NULLIF(trim(p_tool),''),
    trim(p_subject),
    trim(p_message),
    COALESCE(p_links, '{}'::text[]),
    COALESCE(p_attachments, '[]'::jsonb)
  )
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
$function$;
