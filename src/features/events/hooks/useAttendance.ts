import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Attendance = Tables<'attendance'>;

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: ['attendance', eventId],
    queryFn: async () => {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      const userIds = attendanceData.map(a => a.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('*').in('user_id', userIds)
        : { data: [] };
      
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
        .select('*, events(*)')
        .order('checked_in_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Save attendance for an event: bulk upsert
export function useSaveAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, records, checkedInBy }: {
      eventId: string;
      records: { user_id: string; status: 'present' | 'excused' | 'unexcused' }[];
      checkedInBy: string;
    }) => {
      // Delete existing attendance for this event first
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('event_id', eventId);
      if (deleteError) throw deleteError;

      // Insert only records that have a status set (present or excused)
      const toInsert = records.filter(r => r.status === 'present' || r.status === 'excused').map(r => ({
        event_id: eventId,
        user_id: r.user_id,
        checked_in_by: checkedInBy,
        status: r.status,
        is_excused: r.status === 'excused',
      }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      // Now handle points: award points for "present" members
      // First get the event to know category and points_value
      const { data: event } = await supabase
        .from('events')
        .select('category, points_value, title')
        .eq('id', eventId)
        .single();

      if (event && event.points_value > 0) {
        const presentUserIds = records.filter(r => r.status === 'present').map(r => r.user_id);
        
        if (presentUserIds.length > 0) {
          // Delete existing auto-awarded points for this event
          const { error: delPtsError } = await supabase
            .from('points_ledger')
            .delete()
            .eq('event_id', eventId);
          if (delPtsError) throw delPtsError;

          // Insert new points for present members
          const pointsRecords = presentUserIds.map(uid => ({
            user_id: uid,
            category: event.category,
            points: event.points_value,
            event_id: eventId,
            granted_by: checkedInBy,
            reason: `Attended: ${event.title}`,
          }));

          const { error: ptsError } = await supabase
            .from('points_ledger')
            .insert(pointsRecords);
          if (ptsError) throw ptsError;
        } else {
          // No one present, remove any existing points
          await supabase.from('points_ledger').delete().eq('event_id', eventId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['member-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['member-points'] });
      queryClient.invalidateQueries({ queryKey: ['all-points'] });
      toast({ title: 'Attendance saved and points awarded!' });
    },
    onError: (error) => {
      toast({ title: 'Failed to save attendance', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, userId, checkedInBy }: { eventId: string; userId: string; checkedInBy?: string }) => {
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
          status: 'present',
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
        .update({ is_excused: isExcused, status: isExcused ? 'excused' : 'present', excuse_notes: notes })
        .eq('id', attendanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
      toast({ title: 'Status updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}
