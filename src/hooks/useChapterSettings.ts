import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useChapterSetting(key: string) {
  return useQuery({
    queryKey: ['chapter-settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value as boolean ?? false;
    },
  });
}

export function useUpdateChapterSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('chapter_settings')
        .update({ value: value as any, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-settings', key] });
      toast.success('Setting updated');
    },
    onError: () => {
      toast.error('Failed to update setting');
    },
  });
}
