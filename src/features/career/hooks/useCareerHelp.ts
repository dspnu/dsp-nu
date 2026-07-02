import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CareerHelpRequest {
  id: string;
  user_id: string;
  tool: string | null;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  resolved_at: string | null;
  resolver_id: string | null;
  created_at: string;
  updated_at: string;
  requester?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export function useCareerHelpRequests(scope: 'mine' | 'all' = 'mine') {
  return useQuery({
    queryKey: ['career-help-requests', scope],
    queryFn: async () => {
      let query = supabase
        .from('career_help_requests' as any)
        .select('*, requester:profiles!career_help_requests_user_id_fkey(first_name,last_name,email)')
        .order('created_at', { ascending: false });

      if (scope === 'mine') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [] as CareerHelpRequest[];
        query = query.eq('user_id', user.id);
      }
      // For 'all' scope we rely on RLS to restrict to helpers.
      const { data, error } = await query;
      // Retry without join if FK not detected
      if (error && String(error.message || '').includes('relationship')) {
        const { data: d2, error: e2 } = await (scope === 'mine'
          ? supabase.from('career_help_requests' as any).select('*').order('created_at', { ascending: false })
          : supabase.from('career_help_requests' as any).select('*').order('created_at', { ascending: false }));
        if (e2) throw e2;
        return (d2 ?? []) as unknown as CareerHelpRequest[];
      }
      if (error) throw error;
      return (data ?? []) as unknown as CareerHelpRequest[];
    },
  });
}

export function useSubmitCareerHelp() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { tool?: string; subject: string; message: string }) => {
      const { data, error } = await supabase.rpc('request_career_help' as any, {
        p_tool: args.tool ?? null,
        p_subject: args.subject,
        p_message: args.message,
      });
      if (error) throw error;
      return data as { ok: boolean; id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career-help-requests'] });
      toast({
        title: 'Request sent',
        description: 'The VP of Professional Activities and Professionalism chairs were notified.',
      });
    },
    onError: (e: any) => {
      toast({ title: 'Could not send request', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCareerHelpStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { id: string; status: CareerHelpRequest['status'] }) => {
      const patch: any = { status: args.status };
      if (args.status === 'resolved') patch.resolved_at = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) patch.resolver_id = user.id;
      const { error } = await supabase
        .from('career_help_requests' as any)
        .update(patch)
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career-help-requests'] });
      toast({ title: 'Updated' });
    },
    onError: (e: any) => {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    },
  });
}

/** Whether the current user can see all requests (helper role). Best-effort: probe with limit 1. */
export function useCanTriageCareerHelp() {
  return useQuery({
    queryKey: ['career-help-can-triage'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      // A helper will see rows they don't own; a plain member won't.
      const { data, error } = await supabase
        .from('career_help_requests' as any)
        .select('id,user_id')
        .neq('user_id', user.id)
        .limit(1);
      if (error) return false;
      if ((data ?? []).length > 0) return true;
      // Fallback: check profile positions
      const { data: prof } = await supabase
        .from('profiles')
        .select('positions')
        .eq('user_id', user.id)
        .maybeSingle();
      const positions: string[] = (prof as any)?.positions ?? [];
      return positions.some(p =>
        p === 'VP of Professional Activities' || /professionalism/i.test(p)
      );
    },
  });
}
