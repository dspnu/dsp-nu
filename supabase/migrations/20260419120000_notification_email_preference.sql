-- Master toggle: send chapter notification emails (Resend) when enabled.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;
