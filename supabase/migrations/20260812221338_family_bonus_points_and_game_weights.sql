-- Family games tables (existed in Lovable production; missing from earlier migration history)

CREATE TABLE IF NOT EXISTS public.family_bonus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  granted_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_game_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  weight numeric NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users (id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_bonus_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_game_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Officers can manage bonus points" ON public.family_bonus_points;
CREATE POLICY "Admin/Officers can manage bonus points"
  ON public.family_bonus_points
  TO authenticated
  USING (public.is_admin_or_officer(auth.uid()))
  WITH CHECK (public.is_admin_or_officer(auth.uid()));

DROP POLICY IF EXISTS "All authenticated can view bonus points" ON public.family_bonus_points;
CREATE POLICY "All authenticated can view bonus points"
  ON public.family_bonus_points
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage weights" ON public.family_game_weights;
CREATE POLICY "Admin/Officers can manage weights"
  ON public.family_game_weights
  TO authenticated
  USING (public.is_admin_or_officer(auth.uid()))
  WITH CHECK (public.is_admin_or_officer(auth.uid()));

DROP POLICY IF EXISTS "All authenticated can view weights" ON public.family_game_weights;
CREATE POLICY "All authenticated can view weights"
  ON public.family_game_weights
  FOR SELECT
  TO authenticated
  USING (true);

-- Bucket used by career help attachments (code expects it)
INSERT INTO storage.buckets (id, name, public)
VALUES ('career-help-attachments', 'career-help-attachments', false)
ON CONFLICT (id) DO NOTHING;
