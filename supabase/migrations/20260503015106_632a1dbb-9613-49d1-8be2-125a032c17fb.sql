
-- ============================================================
-- 1. FIX PRIVILEGE ESCALATION: restrict profile self-update
-- ============================================================
-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with WITH CHECK that prevents changing sensitive fields
-- Users can update their own profile but cannot change positions, status, chair, committees
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- If user is admin, allow all changes
      public.has_role(auth.uid(), 'admin')
      -- Otherwise, sensitive fields must remain unchanged (use coalesce for null handling)
      OR (
        positions IS NOT DISTINCT FROM (SELECT p.positions FROM public.profiles p WHERE p.user_id = auth.uid())
        AND status IS NOT DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid())
        AND chair IS NOT DISTINCT FROM (SELECT p.chair FROM public.profiles p WHERE p.user_id = auth.uid())
        AND committees IS NOT DISTINCT FROM (SELECT p.committees FROM public.profiles p WHERE p.user_id = auth.uid())
      )
    )
  );

-- ============================================================
-- 2. FIX PUBLIC ROLE POLICIES → authenticated
-- ============================================================

-- approved_coffee_chat_members
DROP POLICY IF EXISTS "All authenticated users can view approved members" ON public.approved_coffee_chat_members;
CREATE POLICY "All authenticated users can view approved members"
  ON public.approved_coffee_chat_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage approved members" ON public.approved_coffee_chat_members;
CREATE POLICY "Admin/Officers can manage approved members"
  ON public.approved_coffee_chat_members FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- election_candidates
DROP POLICY IF EXISTS "All authenticated can view election candidates" ON public.election_candidates;
CREATE POLICY "All authenticated can view election candidates"
  ON public.election_candidates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage election candidates" ON public.election_candidates;
CREATE POLICY "Admin/Officers can manage election candidates"
  ON public.election_candidates FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- dues_config
DROP POLICY IF EXISTS "All authenticated can view dues config" ON public.dues_config;
CREATE POLICY "All authenticated can view dues config"
  ON public.dues_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage dues config" ON public.dues_config;
CREATE POLICY "Admin/Officers can manage dues config"
  ON public.dues_config FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- dues_late_fees
DROP POLICY IF EXISTS "All authenticated can view late fees" ON public.dues_late_fees;
CREATE POLICY "All authenticated can view late fees"
  ON public.dues_late_fees FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage late fees" ON public.dues_late_fees;
CREATE POLICY "Admin/Officers can manage late fees"
  ON public.dues_late_fees FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- coffee_chat_milestones
DROP POLICY IF EXISTS "All authenticated users can view milestones" ON public.coffee_chat_milestones;
CREATE POLICY "All authenticated users can view milestones"
  ON public.coffee_chat_milestones FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage milestones" ON public.coffee_chat_milestones;
CREATE POLICY "Admin/Officers can manage milestones"
  ON public.coffee_chat_milestones FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- pdp_modules
DROP POLICY IF EXISTS "All authenticated users can view pdp modules" ON public.pdp_modules;
CREATE POLICY "All authenticated users can view pdp modules"
  ON public.pdp_modules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage pdp modules" ON public.pdp_modules;
CREATE POLICY "Admin/Officers can manage pdp modules"
  ON public.pdp_modules FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- pdp_resources
DROP POLICY IF EXISTS "All authenticated users can view pdp resources" ON public.pdp_resources;
CREATE POLICY "All authenticated users can view pdp resources"
  ON public.pdp_resources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage pdp resources" ON public.pdp_resources;
CREATE POLICY "Admin/Officers can manage pdp resources"
  ON public.pdp_resources FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- pdp_assignments
DROP POLICY IF EXISTS "All authenticated users can view assignments" ON public.pdp_assignments;
CREATE POLICY "All authenticated users can view assignments"
  ON public.pdp_assignments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage assignments" ON public.pdp_assignments;
CREATE POLICY "Admin/Officers can manage assignments"
  ON public.pdp_assignments FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- chair_positions
DROP POLICY IF EXISTS "All authenticated users can view chair positions" ON public.chair_positions;
CREATE POLICY "All authenticated users can view chair positions"
  ON public.chair_positions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage chair positions" ON public.chair_positions;
CREATE POLICY "Admin/Officers can manage chair positions"
  ON public.chair_positions FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- elections
DROP POLICY IF EXISTS "All authenticated can view elections" ON public.elections;
CREATE POLICY "All authenticated can view elections"
  ON public.elections FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage elections" ON public.elections;
CREATE POLICY "Admin/Officers can manage elections"
  ON public.elections FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- election_positions
DROP POLICY IF EXISTS "All authenticated can view election positions" ON public.election_positions;
CREATE POLICY "All authenticated can view election positions"
  ON public.election_positions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Officers can manage election positions" ON public.election_positions;
CREATE POLICY "Admin/Officers can manage election positions"
  ON public.election_positions FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- election_votes (fix public → authenticated)
DROP POLICY IF EXISTS "Admin/Officers can view all votes" ON public.election_votes;
CREATE POLICY "Admin/Officers can view all votes"
  ON public.election_votes FOR SELECT
  TO authenticated USING (is_admin_or_officer(auth.uid()));

DROP POLICY IF EXISTS "Users can cast votes" ON public.election_votes;
CREATE POLICY "Users can cast votes"
  ON public.election_votes FOR INSERT
  TO authenticated WITH CHECK (voter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own votes" ON public.election_votes;
CREATE POLICY "Users can view own votes"
  ON public.election_votes FOR SELECT
  TO authenticated USING (voter_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own votes" ON public.election_votes;
CREATE POLICY "Users can update own votes"
  ON public.election_votes FOR UPDATE
  TO authenticated USING (voter_id = auth.uid());

-- dues_installments
DROP POLICY IF EXISTS "Users can view own installments" ON public.dues_installments;
CREATE POLICY "Users can view own installments"
  ON public.dues_installments FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin/Officers can manage installments" ON public.dues_installments;
CREATE POLICY "Admin/Officers can manage installments"
  ON public.dues_installments FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- dues_line_items
DROP POLICY IF EXISTS "Users can view own line items" ON public.dues_line_items;
CREATE POLICY "Users can view own line items"
  ON public.dues_line_items FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin/Officers can manage line items" ON public.dues_line_items;
CREATE POLICY "Admin/Officers can manage line items"
  ON public.dues_line_items FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- coffee_chats (fix delete policies)
DROP POLICY IF EXISTS "Users can delete own coffee chats" ON public.coffee_chats;
CREATE POLICY "Users can delete own coffee chats"
  ON public.coffee_chats FOR DELETE
  TO authenticated USING (initiator_id = auth.uid());

DROP POLICY IF EXISTS "Admin/Officers can delete coffee chats" ON public.coffee_chats;
CREATE POLICY "Admin/Officers can delete coffee chats"
  ON public.coffee_chats FOR DELETE
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- service_hours (fix public → authenticated)
DROP POLICY IF EXISTS "Users can log service hours" ON public.service_hours;
CREATE POLICY "Users can log service hours"
  ON public.service_hours FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own service hours" ON public.service_hours;
CREATE POLICY "Users can view own service hours"
  ON public.service_hours FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin/Officers can manage service hours" ON public.service_hours;
CREATE POLICY "Admin/Officers can manage service hours"
  ON public.service_hours FOR ALL
  TO authenticated USING (is_admin_or_officer(auth.uid()));

DROP POLICY IF EXISTS "Admin/Officers can view all service hours" ON public.service_hours;
CREATE POLICY "Admin/Officers can view all service hours"
  ON public.service_hours FOR SELECT
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- eop_ready (fix public → authenticated)
DROP POLICY IF EXISTS "Users can view ready statuses" ON public.eop_ready;
CREATE POLICY "Users can view ready statuses"
  ON public.eop_ready FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can mark themselves ready" ON public.eop_ready;
CREATE POLICY "Users can mark themselves ready"
  ON public.eop_ready FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unmark themselves ready" ON public.eop_ready;
CREATE POLICY "Users can unmark themselves ready"
  ON public.eop_ready FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- pdp_comments (fix public → authenticated + fix impersonation)
DROP POLICY IF EXISTS "Users can add comments" ON public.pdp_comments;
CREATE POLICY "Users can add comments"
  ON public.pdp_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view relevant comments" ON public.pdp_comments;
CREATE POLICY "Users can view relevant comments"
  ON public.pdp_comments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_officer(auth.uid())
    OR EXISTS (
      SELECT 1 FROM pdp_submissions s
      WHERE s.id = pdp_comments.submission_id AND s.user_id = auth.uid()
    )
  );

-- pdp_submissions (fix public → authenticated)
DROP POLICY IF EXISTS "Users can submit own work" ON public.pdp_submissions;
CREATE POLICY "Users can submit own work"
  ON public.pdp_submissions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own submissions" ON public.pdp_submissions;
CREATE POLICY "Users can update own submissions"
  ON public.pdp_submissions FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_admin_or_officer(auth.uid()));

DROP POLICY IF EXISTS "Users can view own submissions" ON public.pdp_submissions;
CREATE POLICY "Users can view own submissions"
  ON public.pdp_submissions FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin_or_officer(auth.uid()));

-- notification_preferences (fix public → authenticated)
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- notifications (fix public → authenticated for delete/update)
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 3. EOP CANDIDATES: restrict SELECT to officers only
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view candidates" ON public.eop_candidates;
CREATE POLICY "Officers can view candidates"
  ON public.eop_candidates FOR SELECT
  TO authenticated USING (is_admin_or_officer(auth.uid()));

-- ============================================================
-- 4. AUDIT LOGS: restrict INSERT to enforce performed_by
-- ============================================================
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (performed_by = auth.uid());

-- ============================================================
-- 5. REMOVE HARDCODED EMAIL from can_manage_user_roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_user_roles(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;
