import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Resource = Tables<'resources'>;
type ResourceInsert = TablesInsert<'resources'>;

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('folder', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useResourcesByFolder(folder: string) {
  return useQuery({
    queryKey: ['resources', folder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('folder', folder)
        .order('title', { ascending: true });

      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (resource: Omit<ResourceInsert, 'uploaded_by'>) => {
      const { data, error } = await supabase
        .from('resources')
        .insert({
          ...resource,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource added!');
    },
    onError: (error) => {
      toast.error('Failed to add resource: ' + error.message);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Resource> & { id: string }) => {
      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource updated!');
    },
    onError: (error) => {
      toast.error('Failed to update resource: ' + error.message);
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete resource: ' + error.message);
    },
  });
}

export function useApproveResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // is_approved column was removed; this is now a no-op kept for API compat
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource approved');
    },
    onError: (error) => {
      toast.error('Failed to approve resource: ' + error.message);
    },
  });
}

export function useFolders() {
  return useQuery({
    queryKey: ['resource-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('folder')
        .order('folder');

      if (error) throw error;
      
      // Get unique folders
      const folders = [...new Set(data.map(r => r.folder))];
      return folders;
    },
  });
}
