import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { Tables } from '@/integrations/supabase/types';

export type EventTicket = Tables<'event_tickets'>;
export type TicketedEvent = Tables<'ticketed_events'>;

export type TicketWithEvent = EventTicket & { ticketed_events: TicketedEvent };

export function useMyTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['event-tickets', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_tickets')
        .select('*, ticketed_events(*)')
        .eq('user_id', user!.id)
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketWithEvent[];
    },
    enabled: !!user,
  });
}

export function useTicketsForEvent(ticketedEventId: string | null) {
  return useQuery({
    queryKey: ['event-tickets', 'event', ticketedEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('ticketed_event_id', ticketedEventId!)
        .is('cancelled_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as EventTicket[];
    },
    enabled: !!ticketedEventId,
  });
}

export function useTicketCounts(ticketedEventId: string | null) {
  return useQuery({
    queryKey: ['event-tickets', 'count', ticketedEventId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('event_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticketed_event_id', ticketedEventId!)
        .is('cancelled_at', null);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!ticketedEventId,
  });
}
