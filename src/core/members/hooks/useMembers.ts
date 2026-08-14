import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { isDemoMode, demoMembers, getDemoMember, getDemoMemberByUserId, getDemoMemberPoints } from '@/demo';

type Profile = Tables<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      if (isDemoMode()) return demoMembers;
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, email, first_name, last_name, phone, graduation_year, major, status, positions, committees, avatar_url, linkedin_url, family, big, little'
        )
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      if (isDemoMode()) return getDemoMember(id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });
}

export function useMemberByUserId(userId: string) {
  return useQuery({
    queryKey: ['members', 'user', userId],
    queryFn: async () => {
      if (isDemoMode()) return getDemoMemberByUserId(userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProfileUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMemberPoints(userId: string) {
  return useQuery({
    queryKey: ['member-points', userId],
    queryFn: async () => {
      if (isDemoMode()) return getDemoMemberPoints(userId);
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMemberAttendance(userId: string) {
  return useQuery({
    queryKey: ['member-attendance', userId],
    queryFn: async () => {
      if (isDemoMode()) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*, events(*)')
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMemberDues(userId: string) {
  return useQuery({
    queryKey: ['member-dues', userId],
    queryFn: async () => {
      if (isDemoMode()) return [];
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
