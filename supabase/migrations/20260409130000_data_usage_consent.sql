-- Data usage consent (analytics, personalization, product improvements)
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS data_usage_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_usage_consent_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notification_preferences.data_usage_consent IS
  'User opt-in for activity/usage data for analytics, personalization, and product improvements.';
COMMENT ON COLUMN public.notification_preferences.data_usage_consent_updated_at IS
  'When data_usage_consent was last changed by the user.';
