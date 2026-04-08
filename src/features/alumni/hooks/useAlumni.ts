import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Alumni = Tables<'alumni'>;
type AlumniInsert = TablesInsert<'alumni'>;
type AlumniUpdate = TablesUpdate<'alumni'>;

export function useAlumni() {
  return useQuery({
    queryKey: ['alumni'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as Alumni[];
    },
  });
}

export function useAlumnus(id: string) {
  return useQuery({
    queryKey: ['alumni', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Alumni | null;
    },
    enabled: !!id,
  });
}

export function useCreateAlumni() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alumni: AlumniInsert) => {
      const { data, error } = await supabase
        .from('alumni')
        .insert(alumni)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
      toast({ title: 'Alumni added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add alumni', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAlumni() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AlumniUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('alumni')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
      toast({ title: 'Alumni updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update alumni', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAlumni() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alumni')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
      toast({ title: 'Alumni deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete alumni', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkCreateAlumni() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alumniList: AlumniInsert[]) => {
      const { data, error } = await supabase
        .from('alumni')
        .insert(alumniList)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
      toast({ title: `${data.length} alumni imported successfully` });
    },
    onError: (error) => {
      toast({ title: 'Failed to import alumni', description: error.message, variant: 'destructive' });
    },
  });
}
