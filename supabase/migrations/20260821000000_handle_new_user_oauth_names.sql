-- Parse Apple/Google OAuth name metadata when creating profiles.
-- Apple may send given_name/family_name/full_name; Google often sends full_name/name.
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
  v_first text;
  v_last text;
  v_full text;
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

  v_first := nullif(trim(coalesce(
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'given_name',
    NEW.raw_user_meta_data ->> 'givenName',
    ''
  )), '');

  v_last := nullif(trim(coalesce(
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'family_name',
    NEW.raw_user_meta_data ->> 'familyName',
    ''
  )), '');

  IF v_first IS NULL AND v_last IS NULL THEN
    v_full := nullif(trim(coalesce(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'fullName',
      ''
    )), '');

    IF v_full IS NOT NULL THEN
      IF position(' ' in v_full) > 0 THEN
        v_first := split_part(v_full, ' ', 1);
        v_last := nullif(trim(substr(v_full, length(v_first) + 2)), '');
      ELSE
        v_first := v_full;
        v_last := '';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, email, first_name, last_name, signup_unlocked)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(v_first, ''),
    coalesce(v_last, ''),
    v_unlocked
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  RETURN NEW;
END;
$$;
