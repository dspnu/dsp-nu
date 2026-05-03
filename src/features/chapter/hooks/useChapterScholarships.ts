import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export function useChapterScholarships() {
  return useQuery({
    queryKey: ['chapter-scholarships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_scholarships')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChapterScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<'chapter_scholarships'>) => {
      const { data, error } = await supabase.from('chapter_scholarships').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-scholarships'] });
      toast.success('Scholarship created');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create scholarship'),
  });
}

export function useUpdateChapterScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<'chapter_scholarships'> & { id: string }) => {
      const { data, error } = await supabase.from('chapter_scholarships').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-scholarships'] });
      toast.success('Scholarship updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update scholarship'),
  });
}

export function useDeleteChapterScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chapter_scholarships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-scholarships'] });
      toast.success('Scholarship removed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove scholarship'),
  });
}
