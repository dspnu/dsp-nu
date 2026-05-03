-- 1. Drop audit_logs INSERT policy to prevent log poisoning
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- 2. Restrict notifications INSERT to admins/officers only
DROP POLICY IF EXISTS "Users and officers can create notifications" ON public.notifications;
CREATE POLICY "Officers can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_officer(auth.uid()));

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('pnm-pictures', 'service-hours-photos', 'paddle-media');

-- 4. Update storage policies: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "PNM pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Service hour photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Paddle media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view PNM pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view service hour photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view paddle media" ON storage.objects;

CREATE POLICY "Authenticated users can view PNM pictures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pnm-pictures');

CREATE POLICY "Authenticated users can view service hour photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-hours-photos');

CREATE POLICY "Authenticated users can view paddle media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'paddle-media');

-- 5. Revoke EXECUTE on SECURITY DEFINER functions from anon role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_officer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_user_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_exported_data(date, date, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.broadcast_chapter_announcement(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_members_new_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_event_rsvps_updated(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_holders_ticketed_event_updated(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_ticketed_event_ticket(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_ticketed_event_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_own_event_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_in_ticket_by_code(text) FROM anon;