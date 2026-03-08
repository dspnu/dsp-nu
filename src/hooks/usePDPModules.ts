import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PDPModule {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function usePDPModules() {
  return useQuery({
    queryKey: ['pdp-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_modules')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PDPModule[];
    },
  });
}

export function useCreatePDPModule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vals: { name: string; description?: string }) => {
      // Get next sort order
      const { data: existing } = await supabase
        .from('pdp_modules')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase.from('pdp_modules').insert({
        name: vals.name,
        description: vals.description || null,
        sort_order: nextOrder,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-modules'] });
      toast({ title: 'Module created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdatePDPModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...vals }: { id: string; name?: string; description?: string; sort_order?: number }) => {
      const { error } = await supabase.from('pdp_modules').update(vals).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-modules'] });
      toast({ title: 'Module updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useReorderPDPModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modules: { id: string; sort_order: number }[]) => {
      const promises = modules.map(m =>
        supabase.from('pdp_modules').update({ sort_order: m.sort_order }).eq('id', m.id)
      );
      const results = await Promise.all(promises);
      const err = results.find(r => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-modules'] });
    },
    onError: (e: Error) => toast({ title: 'Error reordering', description: e.message, variant: 'destructive' }),
  });
}

export function useDeletePDPModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pdp_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-modules'] });
      qc.invalidateQueries({ queryKey: ['pdp-assignments'] });
      qc.invalidateQueries({ queryKey: ['pdp-resources'] });
      toast({ title: 'Module deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
