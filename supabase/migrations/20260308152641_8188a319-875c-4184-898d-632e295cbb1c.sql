
-- Dues configuration tiers (VP Finance can edit)
CREATE TABLE public.dues_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL,
  member_status text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  semester text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Late fee configuration
CREATE TABLE public.dues_late_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester text NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  deadline timestamptz NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Line items: payments, fines, credits, late fees for each member
CREATE TABLE public.dues_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  semester text NOT NULL,
  type text NOT NULL DEFAULT 'payment',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Installment plans
CREATE TABLE public.dues_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  semester text NOT NULL,
  installment_number integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add payment_required to events
ALTER TABLE public.events ADD COLUMN payment_required boolean NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.dues_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_late_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_installments ENABLE ROW LEVEL SECURITY;

-- dues_config: officers manage, all authenticated view
CREATE POLICY "Admin/Officers can manage dues config" ON public.dues_config FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "All authenticated can view dues config" ON public.dues_config FOR SELECT USING (true);

-- dues_late_fees: officers manage, all view
CREATE POLICY "Admin/Officers can manage late fees" ON public.dues_late_fees FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "All authenticated can view late fees" ON public.dues_late_fees FOR SELECT USING (true);

-- dues_line_items: officers manage, users view own
CREATE POLICY "Admin/Officers can manage line items" ON public.dues_line_items FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can view own line items" ON public.dues_line_items FOR SELECT USING (user_id = auth.uid());

-- dues_installments: officers manage, users view own
CREATE POLICY "Admin/Officers can manage installments" ON public.dues_installments FOR ALL USING (is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can view own installments" ON public.dues_installments FOR SELECT USING (user_id = auth.uid());
