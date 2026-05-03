import { Bell, CalendarClock, Megaphone, Sparkles, type LucideIcon } from 'lucide-react';

export type NotificationGroupId = 'reminders' | 'events' | 'announcements' | 'other';

export function getNotificationGroupId(type: string): NotificationGroupId {
  if (type === 'event_reminder') return 'reminders';
  if (type === 'announcement') return 'announcements';
  if (type === 'new_event' || type === 'event_update' || type === 'event') return 'events';
  if (type === 'dues_reminder' || type === 'dues_overdue') return 'reminders';
  if (type === 'exec_task_assigned') return 'reminders';
  return 'other';
}

export const GROUP_ORDER: NotificationGroupId[] = ['reminders', 'events', 'announcements', 'other'];

export const GROUP_LABELS: Record<NotificationGroupId, string> = {
  reminders: 'Reminders',
  events: 'Events & updates',
  announcements: 'Announcements',
  other: 'Other',
};

export const GROUP_ICONS: Record<NotificationGroupId, LucideIcon> = {
  reminders: CalendarClock,
  events: Bell,
  announcements: Megaphone,
  other: Sparkles,
};
