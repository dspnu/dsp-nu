-- Hosted Clover checkout sessions created by Edge Functions; webhooks complete payment into dues / tickets.

CREATE TABLE public.clover_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id TEXT NOT NULL UNIQUE,
  clover_payment_id TEXT,
  link_url TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  purpose TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  ticketed_event_id UUID REFERENCES public.ticketed_events (id) ON DELETE SET NULL,
  event_ticket_id UUID REFERENCES public.event_tickets (id) ON DELETE SET NULL,
  semester TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clover_checkouts_purpose_chk CHECK (purpose IN ('dues', 'ticket', 'generic')),
  CONSTRAINT clover_checkouts_status_chk CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT clover_checkouts_amount_nonneg CHECK (amount_cents > 0)
);

CREATE UNIQUE INDEX clover_checkouts_payment_id_unique
  ON public.clover_checkouts (clover_payment_id)
  WHERE clover_payment_id IS NOT NULL;

CREATE INDEX clover_checkouts_user_created_idx ON public.clover_checkouts (user_id, created_at DESC);
CREATE INDEX clover_checkouts_status_idx ON public.clover_checkouts (status);

CREATE TRIGGER clover_checkouts_updated_at
  BEFORE UPDATE ON public.clover_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clover_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clover_checkouts_officer_select"
  ON public.clover_checkouts
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_officer(auth.uid()));

CREATE POLICY "clover_checkouts_member_select_own"
  ON public.clover_checkouts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
