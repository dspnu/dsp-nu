import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceHour {
  id: string;
  user_id: string;
  hours: number;
  description: string;
  service_date: string;
  verified: boolean;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useServiceHours(userId?: string) {
  return useQuery({
    queryKey: ['service-hours', userId],
    queryFn: async () => {
      let query = supabase
        .from('service_hours')
        .select('*')
        .order('service_date', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceHour[];
    },
    enabled: !!userId,
  });
}

export function useAllServiceHours() {
  return useQuery({
    queryKey: ['all-service-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_hours')
        .select('*')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data as ServiceHour[];
    },
  });
}

export function useLogServiceHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      user_id: string;
      hours: number;
      description: string;
      service_date: string;
    }) => {
      const { error } = await supabase.from('service_hours').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service hours logged');
      queryClient.invalidateQueries({ queryKey: ['service-hours'] });
      queryClient.invalidateQueries({ queryKey: ['all-service-hours'] });
    },
    onError: () => {
      toast.error('Failed to log service hours');
    },
  });
}

export function useVerifyServiceHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, verified_by }: { id: string; verified_by: string }) => {
      const { error } = await supabase
        .from('service_hours')
        .update({ verified: true, verified_by })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service hours verified');
      queryClient.invalidateQueries({ queryKey: ['service-hours'] });
      queryClient.invalidateQueries({ queryKey: ['all-service-hours'] });
    },
    onError: () => {
      toast.error('Failed to verify service hours');
    },
  });
}
