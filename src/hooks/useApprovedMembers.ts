import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ApprovedCoffeeChatMember {
  id: string;
  first_name: string;
  last_name: string;
  osu_email: string | null;
  dsp_position: string | null;
  majors: string | null;
  minors: string | null;
  hometown: string | null;
  state: string | null;
  school_year: string | null;
  pledge_class: string | null;
  family: string | null;
  grand_big: string | null;
  big: string | null;
  littles: string | null;
  osu_involvements: string | null;
  internships_experiences: string | null;
  hobbies_interests: string | null;
  fun_facts: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useApprovedMembers() {
  return useQuery({
    queryKey: ['approved-coffee-chat-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_coffee_chat_members')
        .select('*')
        .order('last_name', { ascending: true });
      if (error) throw error;
      return data as ApprovedCoffeeChatMember[];
    },
  });
}

export function useImportApprovedMembers() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rows: Record<string, string>[]) => {
      if (!user) throw new Error('Not authenticated');

      // Clear existing approved members before importing new list
      const { error: deleteError } = await supabase
        .from('approved_coffee_chat_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
      if (deleteError) throw deleteError;

      const mapped = rows.map(row => ({
        first_name: row['First Name'] || row['first_name'] || '',
        last_name: row['Last Name'] || row['last_name'] || '',
        osu_email: row['OSU Email'] || row['osu_email'] || null,
        dsp_position: row['Current DSP Position'] || row['dsp_position'] || null,
        majors: row['Major(s)'] || row['majors'] || null,
        minors: row['Minor(s)'] || row['minors'] || null,
        hometown: row['Hometown'] || row['hometown'] || null,
        state: row['State'] || row['state'] || null,
        school_year: row['School Year'] || row['school_year'] || null,
        pledge_class: row['Pledge Class'] || row['pledge_class'] || null,
        family: row['Family'] || row['family'] || null,
        grand_big: row['Grand Big'] || row['grand_big'] || null,
        big: row['Big'] || row['big'] || null,
        littles: row['Little(s)'] || row['littles'] || null,
        osu_involvements: row['OSU Involvements'] || row['osu_involvements'] || null,
        internships_experiences: row['Past and Upcoming Internships/Experiences'] || row['internships_experiences'] || null,
        hobbies_interests: row['Hobbies/Interests'] || row['hobbies_interests'] || null,
        fun_facts: row['Fun Facts About Yourself'] || row['fun_facts'] || null,
        uploaded_by: user.id,
      })).filter(r => r.first_name && r.last_name);

      if (mapped.length === 0) throw new Error('No valid rows found in CSV');

      // Insert in batches of 50
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from('approved_coffee_chat_members').insert(batch);
        if (error) throw error;
      }

      return mapped.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['approved-coffee-chat-members'] });
      toast.success(`Imported ${count} approved members`);
    },
    onError: (e: Error) => {
      toast.error('Import failed: ' + e.message);
    },
  });
}

export function useDeleteAllApprovedMembers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('approved_coffee_chat_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approved-coffee-chat-members'] });
      toast.success('Approved member list cleared');
    },
  });
}
