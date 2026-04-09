import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export function useChapterSetting(key: string, options?: { whenMissing?: boolean }) {
  const whenMissing = options?.whenMissing;

  return useQuery({
    queryKey: ['chapter-settings', key, whenMissing ?? 'default'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (data == null && whenMissing !== undefined) {
        return whenMissing;
      }
      return data?.value ?? false;
    },
  });
}

export function useUpdateChapterSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      // Upsert: try update first, then insert if not exists
      const { data: existing } = await supabase
        .from('chapter_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chapter_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chapter_settings')
          .insert({ key, value });
        if (error) throw error;
      }
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
