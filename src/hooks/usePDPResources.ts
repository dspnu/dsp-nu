import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PDPResource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  file_url: string | null;
  file_type: string | null;
  module_id: string | null;
  created_by: string;
  created_at: string;
}

export function usePDPResources() {
  return useQuery({
    queryKey: ['pdp-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PDPResource[];
    },
  });
}

export function useCreatePDPResource() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vals: { title: string; description?: string; url?: string; module_id?: string }) => {
      const { error } = await supabase.from('pdp_resources').insert({
        title: vals.title,
        description: vals.description || null,
        url: vals.url || null,
        module_id: vals.module_id || null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-resources'] });
      toast({ title: 'Resource added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeletePDPResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pdp_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-resources'] });
      toast({ title: 'Resource deleted' });
    },
  });
}
