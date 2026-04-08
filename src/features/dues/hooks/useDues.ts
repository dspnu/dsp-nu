import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DuesPayment {
  id: string;
  user_id: string;
  amount: number;
  semester: string;
  notes: string | null;
  created_by: string | null;
  paid_at: string;
}

export function useAllDues() {
  return useQuery({
    queryKey: ['all-dues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data as DuesPayment[];
    },
  });
}

export function useRecordDues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      user_id: string;
      amount: number;
      semester: string;
      notes?: string;
      created_by: string;
    }) => {
      const { error } = await supabase.from('dues_payments').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dues payment recorded');
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['member-dues'] });
    },
    onError: () => {
      toast.error('Failed to record dues payment');
    },
  });
}

export function useDeleteDues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dues_payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dues payment deleted');
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['member-dues'] });
    },
    onError: () => {
      toast.error('Failed to delete dues payment');
    },
  });
}
