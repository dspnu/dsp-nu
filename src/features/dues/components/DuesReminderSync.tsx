import { useDuesReminderSync } from '@/features/dues/hooks/useDuesReminderSync';

/** Mount once inside authenticated layout; hook no-ops when dues are disabled. */
export function DuesReminderSync() {
  useDuesReminderSync();
  return null;
}
