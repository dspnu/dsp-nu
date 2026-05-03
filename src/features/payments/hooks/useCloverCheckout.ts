import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export function isCloverCheckoutUiEnabled(): boolean {
  return import.meta.env.VITE_CLOVER_CHECKOUT_ENABLED === 'true';
}

export function useCloverCheckoutsList(options?: { limit?: number }) {
  const limit = options?.limit ?? 75;
  return useQuery({
    queryKey: ['clover-checkouts', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clover_checkouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Tables<'clover_checkouts'>[];
    },
    enabled: isCloverCheckoutUiEnabled(),
  });
}

export type CreateCloverCheckoutPayload = {
  purpose: 'dues' | 'ticket' | 'generic';
  amountCents: number;
  semester?: string;
  targetUserId?: string;
  eventTicketId?: string;
};

export function useCreateCloverCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCloverCheckoutPayload) => {
      const { data, error } = await supabase.functions.invoke('clover-create-checkout', { body: payload });
      if (error) throw new Error(error.message);
      const body = data as {
        url?: string;
        error?: string;
        message?: string;
        details?: string;
        expectedCents?: number;
      };
      if (body?.error) {
        const extra =
          typeof body.expectedCents === 'number' ? ` (expected ${body.expectedCents}¢)` : '';
        throw new Error((body.message || body.error) + extra);
      }
      if (!body?.url) throw new Error('No checkout URL returned');
      return body as { url: string; checkoutSessionId: string; idempotencyKey: string };
    },
    onSuccess: () => {
      toast.success('Checkout link ready');
      queryClient.invalidateQueries({ queryKey: ['clover-checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['dues-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['member-dues'] });
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    },
  });
}
