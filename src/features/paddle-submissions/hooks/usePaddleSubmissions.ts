import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { toast } from 'sonner';

export interface PaddleSubmission {
  id: string;
  user_id: string;
  subject_name: string;
  link_url: string;
  created_at: string;
}

export function useMyPaddleSubmission() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['paddle-submission', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddle_submissions' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PaddleSubmission | null;
    },
  });
}

export function useAllPaddleSubmissions() {
  return useQuery({
    queryKey: ['paddle-submissions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddle_submissions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PaddleSubmission[];
    },
  });
}

export function useSubmitPaddle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, subject_name, link_url }: { user_id: string; subject_name: string; link_url: string }) => {
      const { error } = await supabase
        .from('paddle_submissions' as any)
        .insert({ user_id, subject_name, link_url });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddle-submission'] });
      toast.success('Paddle submission received!');
    },
    onError: () => {
      toast.error('Failed to submit paddle');
    },
  });
}
