import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type JobPost = Tables<'job_posts'>;
type JobPostInsert = TablesInsert<'job_posts'>;
type JobPostUpdate = TablesUpdate<'job_posts'>;

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as JobPost[];
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as JobPost | null;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (job: JobPostInsert) => {
      const { data, error } = await supabase
        .from('job_posts')
        .insert(job)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job posted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to post job', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: JobPostUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('job_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update job', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete job', description: error.message, variant: 'destructive' });
    },
  });
}

export function useJobBookmarks(userId: string) {
  const queryClient = useQueryClient();

  const bookmarksQuery = useQuery({
    queryKey: ['job-bookmarks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_bookmarks')
        .select('job_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data.map(b => b.job_id);
    },
    enabled: !!userId,
  });

  const toggleBookmark = useMutation({
    mutationFn: async (jobId: string) => {
      const isBookmarked = bookmarksQuery.data?.includes(jobId);
      
      if (isBookmarked) {
        const { error } = await supabase
          .from('job_bookmarks')
          .delete()
          .eq('job_id', jobId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_bookmarks')
          .insert({ job_id: jobId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-bookmarks', userId] });
    },
  });

  return { 
    bookmarks: bookmarksQuery.data ?? [], 
    isLoading: bookmarksQuery.isLoading, 
    toggleBookmark: toggleBookmark.mutate 
  };
}
