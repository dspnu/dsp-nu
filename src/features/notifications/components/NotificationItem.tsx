import type { ReactNode } from 'react';
import type { Notification } from '@/features/notifications/hooks/useNotifications';
import { formatNotificationTimestamp } from '@/features/notifications/lib/formatNotificationTime';
import { getNotificationGroupId, GROUP_ICONS } from '@/features/notifications/lib/notificationGroups';
import { cn } from '@/lib/utils';
import { Bell, BookOpen, Briefcase, Clock, Coffee, type LucideIcon } from 'lucide-react';

const TYPE_ICONS: Partial<Record<string, LucideIcon>> = {
  pdp: BookOpen,
  service_hours: Clock,
  coffee_chat: Coffee,
  job_board: Briefcase,
  general: Bell,
};

export function getNotificationVisual(type: string): { Icon: LucideIcon } {
  const group = getNotificationGroupId(type);
  const Icon = TYPE_ICONS[type] ?? GROUP_ICONS[group];
  return { Icon };
}

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onOpen?: (n: Notification) => void;
  className?: string;
  /** e.g. per-row menu on the full notification center page */
  endAdornment?: ReactNode;
}

export function NotificationItem({
  notification,
  compact,
  onOpen,
  className,
  endAdornment,
}: NotificationItemProps) {
  const { relative, absolute } = formatNotificationTimestamp(notification.created_at);
  const { Icon } = getNotificationVisual(notification.type);

  const body = (
    <div className="flex min-w-0 flex-1 gap-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
          compact && 'h-8 w-8'
        )}
      >
        <Icon className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              'text-sm leading-snug text-foreground',
              !notification.is_read ? 'font-semibold' : 'font-medium'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
        </div>
        <p
          className={cn(
            'text-muted-foreground leading-snug',
            compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'
          )}
        >
          {notification.message}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <time dateTime={notification.created_at} title={absolute}>
            {relative}
          </time>
          {!compact && <span className="text-muted-foreground/70">· {absolute}</span>}
        </div>
      </div>
    </div>
  );

  const shellClass = cn(
    'flex w-full min-w-0 items-stretch gap-1 rounded-lg border border-transparent transition-colors',
    compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
    !notification.is_read && 'bg-primary/[0.06] border-primary/10',
    onOpen && 'hover:bg-accent/50',
    className
  );

  if (endAdornment) {
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={() => onOpen?.(notification)}
          className={cn('flex min-w-0 flex-1 text-left', onOpen && 'cursor-pointer')}
        >
          {body}
        </button>
        <div className="flex shrink-0 items-start pt-1">{endAdornment}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(notification)}
      className={cn(
        shellClass,
        'gap-3',
        compact ? 'px-3 py-2.5 hover:bg-accent/60' : 'px-4 py-3 hover:bg-accent/50',
        onOpen && 'cursor-pointer'
      )}
    >
      {body}
    </button>
  );
}
