import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Milestone {
  id: string;
  target_count: number;
  deadline: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCoffeeChatMilestones() {
  return useQuery({
    queryKey: ['coffee-chat-milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_chat_milestones')
        .select('*')
        .order('target_count', { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (milestone: { target_count: number; deadline: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('coffee_chat_milestones')
        .insert({ ...milestone, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chat-milestones'] });
      toast.success('Milestone created');
    },
    onError: (error) => {
      toast.error('Failed to create milestone: ' + error.message);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; target_count?: number; deadline?: string }) => {
      const { data, error } = await supabase
        .from('coffee_chat_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chat-milestones'] });
      toast.success('Milestone updated');
    },
    onError: (error) => {
      toast.error('Failed to update milestone: ' + error.message);
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coffee_chat_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chat-milestones'] });
      toast.success('Milestone deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete milestone: ' + error.message);
    },
  });
}
