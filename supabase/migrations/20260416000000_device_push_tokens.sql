-- Stores native device tokens for APNs pushes (iOS) and future platforms.
-- This table is intentionally simple: one row per (user_id, platform, token).

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios')),
  token text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS device_push_tokens_user_platform_token_key
  ON public.device_push_tokens (user_id, platform, token);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens.
DROP POLICY IF EXISTS "device_push_tokens_select_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_select_own"
ON public.device_push_tokens
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_insert_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_insert_own"
ON public.device_push_tokens
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_update_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_update_own"
ON public.device_push_tokens
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_delete_own"
ON public.device_push_tokens
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_push_tokens_set_updated_at ON public.device_push_tokens;
CREATE TRIGGER trg_device_push_tokens_set_updated_at
BEFORE UPDATE ON public.device_push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

