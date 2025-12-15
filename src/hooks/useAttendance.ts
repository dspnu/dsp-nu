import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Attendance = Tables<'attendance'>;
type AttendanceInsert = TablesInsert<'attendance'>;

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: ['attendance', eventId],
    queryFn: async () => {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = attendanceData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      return attendanceData.map(a => ({
        ...a,
        profile: profiles?.find(p => p.user_id === a.user_id),
      }));
    },
    enabled: !!eventId,
  });
}

export function useAllAttendance() {
  return useQuery({
    queryKey: ['all-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, events(*), profiles(*)')
        .order('checked_in_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, userId, checkedInBy }: { eventId: string; userId: string; checkedInBy?: string }) => {
      // Check if already checked in
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        throw new Error('Already checked in to this event');
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          event_id: eventId,
          user_id: userId,
          checked_in_by: checkedInBy,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['member-attendance'] });
      toast({ title: 'Checked in successfully!' });
    },
    onError: (error) => {
      toast({ title: 'Check-in failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleAttendanceOpen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, open }: { eventId: string; open: boolean }) => {
      const { error } = await supabase
        .from('events')
        .update({ attendance_open: open })
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Attendance status updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update attendance status', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateExcuse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attendanceId, isExcused, notes }: { attendanceId: string; isExcused: boolean; notes?: string }) => {
      const { error } = await supabase
        .from('attendance')
        .update({ is_excused: isExcused, excuse_notes: notes })
        .eq('id', attendanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
      toast({ title: 'Excuse updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update excuse', description: error.message, variant: 'destructive' });
    },
  });
}
