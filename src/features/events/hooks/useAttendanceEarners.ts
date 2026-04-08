import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type EventCategory = Database['public']['Enums']['event_category'];

export interface AttendanceEarner {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  points_value: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceEarnerCompletion {
  id: string;
  earner_id: string;
  user_id: string;
  granted_by: string | null;
  created_at: string;
}

export function useAttendanceEarners() {
  return useQuery({
    queryKey: ['attendance-earners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_earners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AttendanceEarner[];
    },
  });
}

export function useAttendanceEarnerCompletions(earnerId?: string) {
  return useQuery({
    queryKey: ['attendance-earner-completions', earnerId],
    queryFn: async () => {
      let query = supabase.from('attendance_earner_completions').select('*');
      if (earnerId) {
        query = query.eq('earner_id', earnerId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceEarnerCompletion[];
    },
  });
}

export function useCreateAttendanceEarner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      category: EventCategory;
      points_value: number;
      created_by?: string;
    }) => {
      const { error } = await supabase.from('attendance_earners').insert({
        title: values.title,
        description: values.description,
        category: values.category,
        points_value: values.points_value,
        created_by: values.created_by,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-earners'] });
      toast.success('Attendance earner created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAttendanceEarner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      title?: string;
      description?: string;
      category?: EventCategory;
      points_value?: number;
      is_active?: boolean;
    }) => {
      const { error } = await supabase.from('attendance_earners').update({
        title: values.title,
        description: values.description,
        category: values.category,
        points_value: values.points_value,
        is_active: values.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-earners'] });
      toast.success('Attendance earner updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAttendanceEarner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance_earners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-earners'] });
      toast.success('Attendance earner deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGrantAttendanceEarner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      earner_id: string;
      user_id: string;
      granted_by: string;
      category: EventCategory;
      points_value: number;
      reason: string;
    }) => {
      // First add the completion record
      const { error: completionError } = await supabase
        .from('attendance_earner_completions')
        .insert({
          earner_id: values.earner_id,
          user_id: values.user_id,
          granted_by: values.granted_by,
        });
      if (completionError) throw completionError;

      // Then add points to the ledger
      const { error: pointsError } = await supabase
        .from('points_ledger')
        .insert({
          user_id: values.user_id,
          category: values.category,
          points: values.points_value,
          granted_by: values.granted_by,
          reason: values.reason,
        });
      if (pointsError) throw pointsError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-earner-completions'] });
      qc.invalidateQueries({ queryKey: ['all-points'] });
      toast.success('Points granted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRevokeAttendanceEarner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (completionId: string) => {
      const { error } = await supabase
        .from('attendance_earner_completions')
        .delete()
        .eq('id', completionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-earner-completions'] });
      toast.success('Completion revoked');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
