-- Optional authenticator MFA: enforce aal2 only for users who enrolled,
-- and let officers reset a lost authenticator.

CREATE OR REPLACE FUNCTION public.session_satisfies_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM auth.mfa_factors
      WHERE user_id = (SELECT auth.uid())
        AND status = 'verified'
    )
    OR COALESCE((SELECT auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.session_satisfies_mfa() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.session_satisfies_mfa() FROM anon;
GRANT EXECUTE ON FUNCTION public.session_satisfies_mfa() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_has_mfa(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin_or_officer((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT public.session_satisfies_mfa() THEN
    RAISE EXCEPTION 'Complete authenticator verification first';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.mfa_factors
    WHERE user_id = p_user_id
      AND status = 'verified'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_has_mfa(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_user_has_mfa(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_user_has_mfa(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_mfa(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin_or_officer((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT public.session_satisfies_mfa() THEN
    RAISE EXCEPTION 'Complete authenticator verification first';
  END IF;
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Use Settings to disable your own authenticator';
  END IF;

  DELETE FROM auth.mfa_factors
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_mfa(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reset_mfa(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_mfa(uuid) TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      'Require verified MFA when enrolled',
      r.nspname,
      r.relname
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.session_satisfies_mfa()) WITH CHECK (public.session_satisfies_mfa())',
      'Require verified MFA when enrolled',
      r.nspname,
      r.relname
    );
  END LOOP;
END $$;
