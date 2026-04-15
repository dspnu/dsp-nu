import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type TicketedEventInsert = TablesInsert<'ticketed_events'>;
type TicketedEventUpdate = TablesUpdate<'ticketed_events'>;

export function useCreateTicketedEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Omit<TicketedEventInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('ticketed_events')
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketed-events'] });
      toast({ title: 'Event created' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not create event', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTicketedEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      notify,
    }: {
      id: string;
      updates: TicketedEventUpdate;
      notify?: { title: string; message: string };
    }) => {
      const { error } = await supabase.from('ticketed_events').update(updates).eq('id', id);
      if (error) throw error;

      if (notify) {
        const { error: nErr } = await supabase.rpc('notify_ticket_holders_ticketed_event_updated', {
          p_ticketed_event_id: id,
          p_title: notify.title,
          p_message: notify.message,
        });
        if (nErr) throw nErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketed-events'] });
      toast({ title: 'Event saved' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not save event', description: e.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTicketedEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ticketed_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketed-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      toast({ title: 'Event deleted' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not delete event', description: e.message, variant: 'destructive' });
    },
  });
}

export function useClaimTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketedEventId: string) => {
      const { data, error } = await supabase.rpc('claim_ticketed_event_ticket', {
        p_ticketed_event_id: ticketedEventId,
      });
      if (error) throw error;
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketed-events'] });
      if (!data?.ok) {
        const msg =
          data?.error === 'sold_out'
            ? 'This event is at capacity.'
            : data?.error === 'already_registered'
              ? 'You already have a ticket.'
              : data?.error === 'registration_closed'
                ? 'Registration is closed.'
                : data?.error === 'event_ended'
                  ? 'This event has ended.'
                  : 'Could not complete registration.';
        toast({ title: 'Unable to register', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'You\'re registered' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not register', description: e.message, variant: 'destructive' });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (args: {
      ticketedEventId: string;
      userId: string;
      waivePayment: boolean;
    }) => {
      const { data, error } = await supabase.rpc('admin_assign_ticketed_event_ticket', {
        p_ticketed_event_id: args.ticketedEventId,
        p_user_id: args.userId,
        p_waive_payment: args.waivePayment,
      });
      if (error) throw error;
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      if (data?.ok) {
        toast({ title: 'Ticket assigned' });
      } else {
        toast({
          title: 'Could not assign',
          description: data?.error === 'sold_out' ? 'Event is at capacity.' : 'Try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Could not assign', description: e.message, variant: 'destructive' });
    },
  });
}

export function useCancelMyTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.rpc('cancel_own_event_ticket', {
        p_ticket_id: ticketId,
      });
      if (error) throw error;
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketed-events'] });
      if (data?.ok) toast({ title: 'Ticket cancelled' });
      else
        toast({
          title: 'Could not cancel',
          description: data?.error === 'already_checked_in' ? 'Already checked in.' : undefined,
          variant: 'destructive',
        });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not cancel', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTicketPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (args: {
      ticketId: string;
      userId: string;
      ticketedEventId: string;
      eventTitle: string;
      paymentStatus: 'paid' | 'pending' | 'waived' | 'not_required';
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from('event_tickets')
        .update({
          payment_status: args.paymentStatus,
          notes: args.notes ?? null,
        })
        .eq('id', args.ticketId);

      if (error) throw error;

      if (args.paymentStatus === 'paid') {
        await supabase.from('notifications').insert({
          user_id: args.userId,
          title: `Payment recorded: ${args.eventTitle}`,
          message: 'Your ticket is confirmed. Open Tickets → My Tickets for your QR code.',
          type: 'ticket_payment_recorded',
          link: '/tickets?tab=my',
          ticketed_event_id: args.ticketedEventId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      toast({ title: 'Ticket updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not update ticket', description: e.message, variant: 'destructive' });
    },
  });
}

export function useCheckInTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('check_in_ticket_by_code', {
        p_code: code.trim(),
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      if (data?.ok) {
        toast({ title: 'Checked in', description: String(data.event_title ?? '') });
      } else if (data?.error === 'already_checked_in') {
        toast({
          title: 'Already checked in',
          description: 'This ticket was used already.',
          variant: 'destructive',
        });
      } else if (data?.error === 'payment_pending') {
        toast({
          title: 'Payment pending',
          description: 'Mark payment received before check-in.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Invalid ticket', description: 'Code not found.', variant: 'destructive' });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Check-in failed', description: e.message, variant: 'destructive' });
    },
  });
}
