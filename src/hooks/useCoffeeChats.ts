import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type CoffeeChat = Tables<'coffee_chats'>;
type CoffeeChatInsert = TablesInsert<'coffee_chats'>;

export function useCoffeeChats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coffee-chats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_chats')
        .select('*')
        .order('chat_date', { ascending: false });

      if (error) throw error;
      return data as CoffeeChat[];
    },
    enabled: !!user,
  });
}

export function useMyCoffeeChats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-coffee-chats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('coffee_chats')
        .select('*')
        .or(`initiator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('chat_date', { ascending: false });

      if (error) throw error;
      return data as CoffeeChat[];
    },
    enabled: !!user,
  });
}

export function useCreateCoffeeChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chat: Omit<CoffeeChatInsert, 'initiator_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('coffee_chats')
        .insert({ ...chat, initiator_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chats'] });
      queryClient.invalidateQueries({ queryKey: ['my-coffee-chats'] });
      toast.success('Coffee chat logged!');
    },
    onError: (error) => {
      toast.error('Failed to log coffee chat: ' + error.message);
    },
  });
}

export function useUpdateCoffeeChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesUpdate<'coffee_chats'>>) => {
      const { data, error } = await supabase
        .from('coffee_chats')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chats'] });
      queryClient.invalidateQueries({ queryKey: ['my-coffee-chats'] });
      toast.success('Coffee chat updated!');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

export function useConfirmCoffeeChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('coffee_chats')
        .update({ status: 'scheduled' as any, confirmed_by: user.id })
        .eq('id', chatId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chats'] });
      queryClient.invalidateQueries({ queryKey: ['my-coffee-chats'] });
      toast.success('Coffee chat confirmed!');
    },
    onError: (error) => {
      toast.error('Failed to confirm: ' + error.message);
    },
  });
}

export function useRejectCoffeeChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const { data, error } = await supabase
        .from('coffee_chats')
        .update({ status: 'completed' as any })
        .eq('id', chatId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chats'] });
      queryClient.invalidateQueries({ queryKey: ['my-coffee-chats'] });
      toast.success('Coffee chat marked as completed');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

export function useDeleteCoffeeChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from('coffee_chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffee-chats'] });
      queryClient.invalidateQueries({ queryKey: ['my-coffee-chats'] });
      toast.success('Coffee chat deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
}
