import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { hasPosition } from '@/config/org';
import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type ExecChapterGoal = Tables<'exec_chapter_goals'>;
export type ExecGoalProgress = Enums<'exec_goal_progress'>;

export function useExecChapterGoals() {
  return useQuery({
    queryKey: ['exec-chapter-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exec_chapter_goals')
        .select('*')
        .order('performance_year', { ascending: false })
        .order('position_title', { ascending: true });
      if (error) throw error;
      return data as ExecChapterGoal[];
    },
  });
}

export function useUpsertExecChapterGoal() {
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useAuth();
  const canEdit = hasPosition(profile, 'President') || isAdmin;

  return useMutation({
    mutationFn: async (payload: TablesInsert<'exec_chapter_goals'> & { id?: string }) => {
      if (!profile?.user_id) throw new Error('Not signed in');
      if (!canEdit) throw new Error('Only the President or an app admin can edit chapter goals');

      const now = new Date().toISOString();
      const row: TablesInsert<'exec_chapter_goals'> = {
        performance_year: payload.performance_year,
        position_title: payload.position_title,
        goal_text: payload.goal_text ?? '',
        success_criteria: payload.success_criteria ?? null,
        actual_summary: payload.actual_summary ?? null,
        progress: payload.progress ?? 'not_started',
        updated_at: now,
        updated_by: profile.user_id,
        created_by: profile.user_id,
      };

      const { data: existing } = await supabase
        .from('exec_chapter_goals')
        .select('id')
        .eq('performance_year', payload.performance_year)
        .eq('position_title', payload.position_title)
        .maybeSingle();

      if (existing?.id) {
        const update: TablesUpdate<'exec_chapter_goals'> = {
          goal_text: row.goal_text,
          success_criteria: row.success_criteria,
          actual_summary: row.actual_summary,
          progress: row.progress,
          updated_at: now,
          updated_by: profile.user_id,
        };
        const { error } = await supabase.from('exec_chapter_goals').update(update).eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      }

      const { data, error } = await supabase
        .from('exec_chapter_goals')
        .insert({ ...row, created_at: now })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-chapter-goals'] });
      toast.success('Goal saved');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save goal'),
  });
}
