-- President exec goals, exec tasks, helpers, RLS, optional notification preference

CREATE OR REPLACE FUNCTION public.is_chapter_president(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND COALESCE(p.positions, '{}'::text[]) @> ARRAY['President']::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_president_or_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_chapter_president(_user_id)
  OR public.has_role(_user_id, 'admin'::public.app_role);
$$;

CREATE TYPE public.exec_goal_progress AS ENUM (
  'not_started',
  'in_progress',
  'met',
  'missed'
);

CREATE TYPE public.exec_task_status AS ENUM (
  'open',
  'done',
  'cancelled'
);

CREATE TABLE public.exec_chapter_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_year text NOT NULL,
  position_title text NOT NULL,
  goal_text text NOT NULL DEFAULT '',
  success_criteria text,
  actual_summary text,
  progress public.exec_goal_progress NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT exec_chapter_goals_year_position_unique UNIQUE (performance_year, position_title)
);

CREATE INDEX idx_exec_chapter_goals_year ON public.exec_chapter_goals (performance_year);
CREATE INDEX idx_exec_chapter_goals_position ON public.exec_chapter_goals (position_title);

CREATE TABLE public.exec_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_at timestamptz,
  status public.exec_task_status NOT NULL DEFAULT 'open',
  priority text,
  assigned_to_user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
  assigned_position text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_tasks_assignee_due ON public.exec_tasks (assigned_to_user_id, due_at);
CREATE INDEX idx_exec_tasks_status_due ON public.exec_tasks (status, due_at);

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS exec_task_notifications boolean NOT NULL DEFAULT true;

ALTER TABLE public.exec_chapter_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can read exec chapter goals"
ON public.exec_chapter_goals FOR SELECT TO authenticated
USING (public.is_admin_or_officer(auth.uid()));

CREATE POLICY "President or app admin can insert exec chapter goals"
ON public.exec_chapter_goals FOR INSERT TO authenticated
WITH CHECK (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "President or app admin can update exec chapter goals"
ON public.exec_chapter_goals FOR UPDATE TO authenticated
USING (public.is_chapter_president_or_app_admin(auth.uid()))
WITH CHECK (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "President or app admin can delete exec chapter goals"
ON public.exec_chapter_goals FOR DELETE TO authenticated
USING (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "Exec tasks readable by assignee or officers"
ON public.exec_tasks FOR SELECT TO authenticated
USING (
  assigned_to_user_id = auth.uid()
  OR public.is_admin_or_officer(auth.uid())
);

CREATE POLICY "President or app admin can insert exec tasks"
ON public.exec_tasks FOR INSERT TO authenticated
WITH CHECK (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "President or app admin can update any exec task"
ON public.exec_tasks FOR UPDATE TO authenticated
USING (public.is_chapter_president_or_app_admin(auth.uid()))
WITH CHECK (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "President or app admin can delete exec tasks"
ON public.exec_tasks FOR DELETE TO authenticated
USING (public.is_chapter_president_or_app_admin(auth.uid()));

CREATE POLICY "Assignee can update own exec task"
ON public.exec_tasks FOR UPDATE TO authenticated
USING (assigned_to_user_id = auth.uid())
WITH CHECK (assigned_to_user_id = auth.uid());

COMMENT ON TABLE public.exec_chapter_goals IS 'Annual executive goals and outcomes; managed by President.';
COMMENT ON TABLE public.exec_tasks IS 'Chapter exec task assignments; President creates, assignees may update own row.';
