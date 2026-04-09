import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAsUnread,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
  type Notification,
} from '@/features/notifications/hooks/useNotifications';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';
import {
  GROUP_ICONS,
  GROUP_LABELS,
  GROUP_ORDER,
  getNotificationGroupId,
} from '@/features/notifications/lib/notificationGroups';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

type FilterTab = 'all' | 'unread';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [clearOpen, setClearOpen] = useState(false);

  const { data: notifications, isLoading } = useNotifications(200);
  const unreadCount = useUnreadCount();
  const markRead = useMarkAsRead();
  const markUnread = useMarkAsUnread();
  const markAllRead = useMarkAllAsRead();
  const remove = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const sections = useMemo(() => {
    return GROUP_ORDER.map((gid) => ({
      id: gid,
      label: GROUP_LABELS[gid],
      Icon: GROUP_ICONS[gid],
      items: filtered.filter((n) => getNotificationGroupId(n.type) === gid),
    })).filter((s) => s.items.length > 0);
  }, [filtered]);

  const handleOpen = (n: Notification) => {
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Notifications"
        description="Reminders, event updates, and chapter messages in one place"
      >
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Mark all read
            </Button>
          )}
          {notifications && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="space-y-6">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {unreadCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {isLoading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="When something needs your attention, it will show up here."
          />
        )}

        {!isLoading && notifications && notifications.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="No unread notifications. Switch to All to see past items."
          />
        )}

        {!isLoading &&
          sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <div className="flex items-center gap-2 px-0.5">
                <section.Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </h2>
              </div>
              <div className="rounded-xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden">
                {section.items.map((n) => (
                  <div key={n.id} className="px-1 py-0.5 sm:px-2">
                    <NotificationItem
                      notification={n}
                      onOpen={handleOpen}
                      endAdornment={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Notification actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {n.is_read ? (
                              <DropdownMenuItem onClick={() => markUnread.mutate(n.id)}>
                                Mark unread
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => markRead.mutate(n.id)}>
                                Mark read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => remove.mutate(n.id)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
      </Tabs>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every notification from your inbox. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                clearAll.mutate(undefined, {
                  onSuccess: () => setClearOpen(false),
                });
              }}
              disabled={clearAll.isPending}
            >
              {clearAll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clear all
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
