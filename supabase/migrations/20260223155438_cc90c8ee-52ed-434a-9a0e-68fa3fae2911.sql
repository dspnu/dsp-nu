
-- Create coffee_chat_milestones table for VPs to set deadlines
CREATE TABLE public.coffee_chat_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_count integer NOT NULL,
  deadline date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coffee_chat_milestones ENABLE ROW LEVEL SECURITY;

-- Only admin/officers can manage milestones
CREATE POLICY "Admin/Officers can manage milestones"
  ON public.coffee_chat_milestones
  FOR ALL
  USING (is_admin_or_officer(auth.uid()));

-- All authenticated users can view milestones
CREATE POLICY "All authenticated users can view milestones"
  ON public.coffee_chat_milestones
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_coffee_chat_milestones_updated_at
  BEFORE UPDATE ON public.coffee_chat_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow coffee chat deletion by creator or admin/officer
CREATE POLICY "Users can delete own coffee chats"
  ON public.coffee_chats
  FOR DELETE
  USING (initiator_id = auth.uid());

CREATE POLICY "Admin/Officers can delete coffee chats"
  ON public.coffee_chats
  FOR DELETE
  USING (is_admin_or_officer(auth.uid()));
