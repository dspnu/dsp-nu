-- Signup invite code: gate new accounts without affecting existing members.

-- 1) Unlock flag on profiles (existing members stay unlocked)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_unlocked boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ALTER COLUMN signup_unlocked SET DEFAULT false;

COMMENT ON COLUMN public.profiles.signup_unlocked IS
  'True once the member has joined with a valid chapter invite code. Existing accounts are grandfathered in.';

-- Prevent users from self-granting signup_unlocked
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        positions IS NOT DISTINCT FROM (SELECT p.positions FROM public.profiles p WHERE p.user_id = auth.uid())
        AND status IS NOT DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid())
        AND chair IS NOT DISTINCT FROM (SELECT p.chair FROM public.profiles p WHERE p.user_id = auth.uid())
        AND committees IS NOT DISTINCT FROM (SELECT p.committees FROM public.profiles p WHERE p.user_id = auth.uid())
        AND signup_unlocked IS NOT DISTINCT FROM (SELECT p.signup_unlocked FROM public.profiles p WHERE p.user_id = auth.uid())
      )
    )
  );

-- 2) Store invite code in chapter_settings; hide secret from non-admins
INSERT INTO public.chapter_settings (key, value)
VALUES ('signup_invite_code', '"DSP-NU"'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "All authenticated users can view settings" ON public.chapter_settings;

CREATE POLICY "Authenticated can view non-secret settings"
  ON public.chapter_settings
  FOR SELECT
  TO authenticated
  USING (
    key <> 'signup_invite_code'
    OR public.is_admin_or_officer(auth.uid())
  );

-- 3) Helpers / RPCs
CREATE OR REPLACE FUNCTION public.normalize_invite_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(trim(both FROM coalesce(p_code, '')));
$$;

CREATE OR REPLACE FUNCTION public.invite_code_matches(p_code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored text;
BEGIN
  SELECT public.normalize_invite_code(cs.value #>> '{}')
  INTO v_stored
  FROM public.chapter_settings cs
  WHERE cs.key = 'signup_invite_code';

  IF v_stored IS NULL OR v_stored = '' THEN
    RETURN false;
  END IF;

  RETURN public.normalize_invite_code(p_code) = v_stored;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_signup_invite(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.invite_code_matches(p_code);
$$;

CREATE OR REPLACE FUNCTION public.unlock_signup_with_invite(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.invite_code_matches(p_code) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET signup_unlocked = true,
      updated_at = now()
  WHERE user_id = v_uid
    AND signup_unlocked IS DISTINCT FROM true;

  -- Already unlocked also counts as success
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_uid AND signup_unlocked = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_invite_code(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invite_code_matches(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_signup_invite(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_signup_with_invite(text) TO authenticated, service_role;

-- 4) New-user trigger: email must have valid code; OAuth may unlock later
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := coalesce(NEW.raw_user_meta_data ->> 'invite_code', '');
  v_unlocked boolean := false;
  v_provider text := coalesce(NEW.raw_app_meta_data ->> 'provider', 'email');
BEGIN
  IF public.invite_code_matches(v_code) THEN
    v_unlocked := true;
  ELSIF v_provider = 'email' THEN
    RAISE EXCEPTION 'invalid_invite_code'
      USING ERRCODE = 'P0001',
            HINT = 'A valid chapter invite code is required to create an account.';
  ELSE
    v_unlocked := false;
  END IF;

  INSERT INTO public.profiles (user_id, email, first_name, last_name, signup_unlocked)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    v_unlocked
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  RETURN NEW;
END;
$$;
