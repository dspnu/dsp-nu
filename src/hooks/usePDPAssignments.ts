import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PDPAssignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  submission_type: 'text' | 'file' | 'both';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PDPSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string | null;
  file_urls: string[];
  status: 'submitted' | 'complete' | 'incomplete';
  created_at: string;
  updated_at: string;
}

export interface PDPComment {
  id: string;
  submission_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function usePDPAssignments() {
  return useQuery({
    queryKey: ['pdp-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_assignments')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as PDPAssignment[];
    },
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vals: { title: string; description?: string; due_date: string; submission_type?: 'text' | 'file' | 'both' }) => {
      const { error } = await supabase.from('pdp_assignments').insert({
        ...vals,
        created_by: user!.id,
      });
      if (error) throw error;

      // Notify all new members about the new assignment
      const { data: newMembers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('status', 'new_member');

      if (newMembers && newMembers.length > 0) {
        const notifications = newMembers.map(m => ({
          user_id: m.user_id,
          title: 'New PDP Assignment',
          message: `"${vals.title}" has been assigned. Due ${new Date(vals.due_date).toLocaleDateString()}.`,
          type: 'pdp',
          link: '/pdp',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-assignments'] });
      toast({ title: 'Assignment created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pdp_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-assignments'] });
      toast({ title: 'Assignment deleted' });
    },
  });
}

export function usePDPSubmissions(assignmentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pdp-submissions', assignmentId],
    queryFn: async () => {
      let query = supabase.from('pdp_submissions').select('*');
      if (assignmentId) query = query.eq('assignment_id', assignmentId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as PDPSubmission[];
    },
    enabled: !!user,
  });
}

export function useMySubmissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pdp-submissions', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_submissions')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as PDPSubmission[];
    },
    enabled: !!user,
  });
}

export function useSubmitAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vals: { assignment_id: string; content?: string; file_urls?: string[] }) => {
      const { error } = await supabase.from('pdp_submissions').upsert({
        assignment_id: vals.assignment_id,
        user_id: user!.id,
        content: vals.content || null,
        file_urls: vals.file_urls || [],
        status: 'submitted',
      }, { onConflict: 'assignment_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-submissions'] });
      toast({ title: 'Submission saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'complete' | 'incomplete' }) => {
      const { error } = await supabase.from('pdp_submissions').update({ status }).eq('id', id);
      if (error) throw error;

      // Get submission to find the user and assignment
      const { data: submission } = await supabase
        .from('pdp_submissions')
        .select('user_id, assignment_id')
        .eq('id', id)
        .single();

      if (submission) {
        const { data: assignment } = await supabase
          .from('pdp_assignments')
          .select('title')
          .eq('id', submission.assignment_id)
          .single();

        await supabase.from('notifications').insert({
          user_id: submission.user_id,
          title: status === 'complete' ? 'Assignment Approved' : 'Assignment Needs Revision',
          message: status === 'complete'
            ? `Your submission for "${assignment?.title || 'an assignment'}" has been marked complete.`
            : `Your submission for "${assignment?.title || 'an assignment'}" needs revision.`,
          type: 'pdp',
          link: '/pdp',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdp-submissions'] });
      toast({ title: 'Status updated' });
    },
  });
}

export function usePDPComments(submissionId?: string) {
  return useQuery({
    queryKey: ['pdp-comments', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_comments')
        .select('*')
        .eq('submission_id', submissionId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PDPComment[];
    },
    enabled: !!submissionId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ submission_id, content }: { submission_id: string; content: string }) => {
      const { error } = await supabase.from('pdp_comments').insert({
        submission_id,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pdp-comments', vars.submission_id] });
    },
  });
}
