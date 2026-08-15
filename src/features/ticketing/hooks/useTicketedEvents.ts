import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { isDemoMode, demoTicketedEvents } from '@/demo';

export type TicketedEvent = Tables<'ticketed_events'>;

export function useTicketedEvents() {
  return useQuery({
    queryKey: ['ticketed-events'],
    queryFn: async () => {
      if (isDemoMode()) return demoTicketedEvents;
      const { data, error } = await supabase

      if (error) {
        if ((error as any)?.status === 404) return [] as TicketedEvent[];
        throw error;
      }
      return data as TicketedEvent[];
    },
  });
}

export function useTicketedEventAdmin() {
  return useQuery({
    queryKey: ['ticketed-events', 'admin'],
    queryFn: async () => {
      if (isDemoMode()) return demoTicketedEvents;
      const { data, error } = await supabase
        .from('ticketed_events')
        .select('*')
        .order('starts_at', { ascending: false });

      if (error) {
        if ((error as any)?.status === 404) return [] as TicketedEvent[];
        throw error;
      }
      return data as TicketedEvent[];
    },
  });
}
