-- Wrap all revokes in DO blocks to handle missing functions gracefully
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_chapter_president(uuid) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_chapter_president_or_app_admin(uuid) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_vp_scholarship_awards(uuid) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.can_manage_chapter_scholarships(uuid) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.apply_clover_checkout_success(text, text) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.mark_clover_checkout_failed(text) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;