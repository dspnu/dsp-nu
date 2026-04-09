import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationPreferences } from '@/features/notifications/hooks/useNotifications';

const REMINDER_WINDOW_HOURS_LOW = 22;
const REMINDER_WINDOW_HOURS_HIGH = 26;

/**
 * When the app loads, creates one "day before" reminder per RSVP'd event in the ~24h window,
 * if the user has reminders enabled and no reminder exists yet for that event.
 */
export function useEventReminderSync() {
  const { user } = useAuth();
  const { data: prefs } = useNotificationPreferences();
  const queryClient = useQueryClient();
  const ranForPrefs = useRef<string | null>(null);

  useEffect(() => {
    ranForPrefs.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!user || prefs == null) return;
    if (!prefs.event_reminder_24h) return;

    const key = `${user.id}:${prefs.event_reminder_24h}`;
    if (ranForPrefs.current === key) return;
    ranForPrefs.current = key;

    void (async () => {
      const now = Date.now();
      const windowStart = new Date(now + REMINDER_WINDOW_HOURS_LOW * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now + REMINDER_WINDOW_HOURS_HIGH * 60 * 60 * 1000).toISOString();

      const { data: rsvps, error: rsvpErr } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_id', user.id)
        .in('response', ['yes', 'maybe']);

      if (rsvpErr || !rsvps?.length) return;

      const eventIds = [...new Set(rsvps.map((r) => r.event_id))];

      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('id, title, start_time')
        .in('id', eventIds)
        .gte('start_time', windowStart)
        .lte('start_time', windowEnd);

      if (evErr || !events?.length) return;

      const { data: existing } = await supabase
        .from('notifications')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('type', 'event_reminder')
        .in(
          'event_id',
          events.map((e) => e.id)
        );

      const existingIds = new Set((existing ?? []).map((n) => n.event_id).filter(Boolean));

      const toCreate = events.filter((e) => !existingIds.has(e.id));
      if (!toCreate.length) return;

      const rows = toCreate.map((e) => ({
        user_id: user.id,
        title: `Tomorrow: ${e.title}`,
        message: `This event starts in about 24 hours. Open Events for time and location.`,
        type: 'event_reminder',
        link: '/events',
        event_id: e.id,
      }));

      const { error: insErr } = await supabase.from('notifications').insert(rows);
      if (!insErr) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
      }
    })();
  }, [user, prefs, queryClient]);
}
