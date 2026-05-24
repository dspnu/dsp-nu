import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type CareerTool =
  | 'resume_review'
  | 'linkedin'
  | 'personal_brand'
  | 'outreach'
  | 'interview_prep'
  | 'job_strategy';

export function useCareerHistory(tool?: CareerTool, limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['career-history', user?.id, tool ?? 'all'],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('career_ai_runs')
        .select('id, tool, title, created_at, model, output, input')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (tool) q = q.eq('tool', tool);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeleteCareerRun() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('career_ai_runs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career-history'] });
      toast({ title: 'Deleted' });
    },
  });
}
