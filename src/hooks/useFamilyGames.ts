import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useFamilyGameWeights() {
  return useQuery({
    queryKey: ['family-game-weights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('family_game_weights').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertFamilyGameWeight() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ category, weight }: { category: string; weight: number }) => {
      const { data: existing } = await supabase
        .from('family_game_weights')
        .select('id')
        .eq('category', category)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('family_game_weights')
          .update({ weight, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('family_game_weights')
          .insert({ category, weight });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-game-weights'] });
      toast({ title: 'Weight updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update weight', description: error.message, variant: 'destructive' });
    },
  });
}

export function useFamilyBonusPoints() {
  return useQuery({
    queryKey: ['family-bonus-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_bonus_points')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddFamilyBonusPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { family_name: string; points: number; reason: string; granted_by?: string }) => {
      const { error } = await supabase.from('family_bonus_points').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-bonus-points'] });
      toast({ title: 'Bonus points added' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add bonus points', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFamilyBonusPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('family_bonus_points').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-bonus-points'] });
      toast({ title: 'Bonus points removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove bonus points', description: error.message, variant: 'destructive' });
    },
  });
}
