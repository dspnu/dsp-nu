import { useEventReminderSync } from '@/features/notifications/hooks/useEventReminderSync';

/** Mount once inside authenticated layout to sync ~24h event reminders. */
export function EventReminderSync() {
  useEventReminderSync();
  return null;
}
