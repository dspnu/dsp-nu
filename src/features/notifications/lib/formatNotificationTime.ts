import { format, formatDistanceToNow } from 'date-fns';

export function formatNotificationTimestamp(iso: string) {
  const d = new Date(iso);
  return {
    relative: formatDistanceToNow(d, { addSuffix: true }),
    absolute: format(d, 'MMM d, yyyy · h:mm a'),
  };
}
