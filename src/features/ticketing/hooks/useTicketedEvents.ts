import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type TicketedEvent = Tables<'ticketed_events'>;

export function useTicketedEvents() {
  return useQuery({
    queryKey: ['ticketed-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticketed_events')
        .select('*')
        .eq('published', true)
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return data as TicketedEvent[];
    },
  });
}

export function useTicketedEventAdmin() {
  return useQuery({
    queryKey: ['ticketed-events', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticketed_events')
        .select('*')
        .order('starts_at', { ascending: false });

      if (error) throw error;
      return data as TicketedEvent[];
    },
  });
}
