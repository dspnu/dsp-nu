import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationPreferences } from '@/features/notifications/hooks/useNotifications';

const WINDOW_H_LOW = 22;
const WINDOW_H_HIGH = 26;

/**
 * One reminder per ticketed event when payment is still pending and the event
 * starts in ~24 hours (same window pattern as event RSVP reminders).
 */
export function useTicketPaymentReminderSync() {
  const { user } = useAuth();
  const { data: prefs } = useNotificationPreferences();
  const queryClient = useQueryClient();
  const ran = useRef<string | null>(null);

  useEffect(() => {
    ran.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!user || prefs == null) return;
    if (!prefs.event_reminder_24h) return;

    const key = `${user.id}:ticket-pay:${prefs.event_reminder_24h}`;
    if (ran.current === key) return;
    ran.current = key;

    void (async () => {
      const now = Date.now();
      const windowStart = new Date(now + WINDOW_H_LOW * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now + WINDOW_H_HIGH * 60 * 60 * 1000).toISOString();

      const { data: rows, error } = await supabase
        .from('event_tickets')
        .select(
          `
          id,
          ticketed_event_id,
          ticketed_events!inner (
            id,
            title,
            starts_at,
            price_cents
          )
        `
        )
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .is('cancelled_at', null);

      if (error || !rows?.length) return;

      const pendingPaid = rows.filter((r) => {
        const ev = r.ticketed_events as { price_cents: number; starts_at: string; title: string };
        if (!ev || ev.price_cents <= 0) return false;
        const st = new Date(ev.starts_at).getTime();
        const ws = new Date(windowStart).getTime();
        const we = new Date(windowEnd).getTime();
        return st >= ws && st <= we;
      });

      if (!pendingPaid.length) return;

      const eventIds = pendingPaid.map((r) => r.ticketed_event_id);

      const { data: existing } = await supabase
        .from('notifications')
        .select('ticketed_event_id')
        .eq('user_id', user.id)
        .eq('type', 'ticket_payment_reminder')
        .in('ticketed_event_id', eventIds);

      const existingSet = new Set((existing ?? []).map((n) => n.ticketed_event_id).filter(Boolean));

      const toCreate = pendingPaid.filter((r) => !existingSet.has(r.ticketed_event_id));
      if (!toCreate.length) return;

      const inserts = toCreate.map((r) => {
        const ev = r.ticketed_events as { title: string };
        return {
          user_id: user.id,
          title: `Payment due soon: ${ev.title}`,
          message:
            'Your ticket is reserved but payment is still pending. Complete payment using the link on your ticket before the event.',
          type: 'ticket_payment_reminder',
          link: '/tickets?tab=my',
          ticketed_event_id: r.ticketed_event_id,
        };
      });

      const { error: insErr } = await supabase.from('notifications').insert(inserts);
      if (!insErr) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
      }
    })();
  }, [user, prefs, queryClient]);
}
