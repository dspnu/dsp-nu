import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { hasPosition } from '@/config/org';
import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type ExecTask = Tables<'exec_tasks'>;
export type ExecTaskStatus = Enums<'exec_task_status'>;

function canManageExecTasks(profile: { positions?: string[] | null } | null, isAdmin: boolean) {
  return hasPosition(profile, 'President') || isAdmin;
}

async function shouldNotifyAssignee(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('exec_task_notifications')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return true;
  return data.exec_task_notifications !== false;
}

async function notifyTaskAssigned(params: { assigneeUserId: string; title: string }) {
  const ok = await shouldNotifyAssignee(params.assigneeUserId);
  if (!ok) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: params.assigneeUserId,
    title: 'New exec task',
    message: params.title,
    type: 'exec_task_assigned',
    link: '/chapter?tab=admin',
    is_read: false,
  });
  if (error) console.error('exec task notification', error);
}

export function useExecTasksList() {
  return useQuery({
    queryKey: ['exec-tasks-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exec_tasks')
        .select('*')
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExecTask[];
    },
  });
}

export function useMyExecTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['exec-tasks-mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exec_tasks')
        .select('*')
        .eq('assigned_to_user_id', user!.id)
        .eq('status', 'open')
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return data as ExecTask[];
    },
    enabled: !!user,
  });
}

export function useCreateExecTask() {
  const queryClient = useQueryClient();
  const { profile, user, isAdmin } = useAuth();
  const canManage = canManageExecTasks(profile, isAdmin);

  return useMutation({
    mutationFn: async (payload: Pick<TablesInsert<'exec_tasks'>, 'title' | 'description' | 'due_at' | 'priority' | 'assigned_to_user_id' | 'assigned_position'>) => {
      if (!user?.id || !profile?.user_id) throw new Error('Not signed in');
      if (!canManage) throw new Error('Only the President or an app admin can create tasks');

      const now = new Date().toISOString();
      const insert: TablesInsert<'exec_tasks'> = {
        title: payload.title,
        description: payload.description ?? null,
        due_at: payload.due_at ?? null,
        priority: payload.priority ?? null,
        assigned_to_user_id: payload.assigned_to_user_id,
        assigned_position: payload.assigned_position ?? null,
        status: 'open',
        created_by: profile.user_id,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from('exec_tasks').insert(insert).select('id,title').single();
      if (error) throw error;

      await notifyTaskAssigned({
        assigneeUserId: payload.assigned_to_user_id,
        title: data.title,
      });

      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-mine'] });
      toast.success('Task created');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create task'),
  });
}

export function useUpdateExecTask() {
  const queryClient = useQueryClient();
  const { profile, user, isAdmin } = useAuth();
  const isPresidentOrAdmin = canManageExecTasks(profile, isAdmin);

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'exec_tasks'> }) => {
      if (!user?.id) throw new Error('Not signed in');

      const { data: row, error: fetchErr } = await supabase
        .from('exec_tasks')
        .select('assigned_to_user_id, title')
        .eq('id', id)
        .single();
      if (fetchErr || !row) throw fetchErr ?? new Error('Task not found');

      const isAssignee = row.assigned_to_user_id === user.id;

      if (!isPresidentOrAdmin && !isAssignee) {
        throw new Error('Not allowed');
      }

      if (!isPresidentOrAdmin && isAssignee) {
        const nextStatus = patch.status;
        if (nextStatus !== 'open' && nextStatus !== 'done') {
          throw new Error('You can only mark the task open or done');
        }
        const { error } = await supabase
          .from('exec_tasks')
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        return;
      }

      const prevAssignee = row.assigned_to_user_id;
      const { error } = await supabase
        .from('exec_tasks')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      if (patch.assigned_to_user_id && patch.assigned_to_user_id !== prevAssignee) {
        const { data: after } = await supabase.from('exec_tasks').select('title, assigned_to_user_id').eq('id', id).single();
        if (after) {
          await notifyTaskAssigned({
            assigneeUserId: after.assigned_to_user_id,
            title: after.title,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-mine'] });
      toast.success('Task updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update task'),
  });
}

export function useDeleteExecTask() {
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useAuth();
  const canManage = canManageExecTasks(profile, isAdmin);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!canManage) throw new Error('Only the President or an app admin can delete tasks');
      const { error } = await supabase.from('exec_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-all'] });
      queryClient.invalidateQueries({ queryKey: ['exec-tasks-mine'] });
      toast.success('Task removed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete task'),
  });
}
