import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

type EOPCandidate = Tables<'eop_candidates'>;
type EOPVote = Tables<'eop_votes'>;
type EOPCandidateInsert = TablesInsert<'eop_candidates'>;
type VoteType = Enums<'eop_vote'>;

export function useEOPCandidates() {
  return useQuery({
    queryKey: ['eop-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as EOPCandidate[];
    },
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidate: EOPCandidateInsert) => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .insert(candidate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates'] });
      toast.success('Candidate added!');
    },
    onError: (error) => {
      toast.error('Failed to add candidate: ' + error.message);
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EOPCandidate> & { id: string }) => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates'] });
      toast.success('Candidate updated!');
    },
    onError: (error) => {
      toast.error('Failed to update candidate: ' + error.message);
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eop_candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates'] });
      toast.success('Candidate removed');
    },
    onError: (error) => {
      toast.error('Failed to remove candidate: ' + error.message);
    },
  });
}

export function useBulkCreateCandidates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidates: EOPCandidateInsert[]) => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .insert(candidates)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates'] });
      toast.success(`${data.length} PNMs imported successfully`);
    },
    onError: (error) => {
      toast.error('Failed to import PNMs: ' + error.message);
    },
  });
}

export function useToggleVoting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, voting_open }: { id: string; voting_open: boolean }) => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .update({ voting_open })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { voting_open }) => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates'] });
      toast.success(voting_open ? 'Voting opened' : 'Voting closed');
    },
    onError: (error) => {
      toast.error('Failed to toggle voting: ' + error.message);
    },
  });
}

export function useMyVotes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-eop-votes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('eop_votes')
        .select('*')
        .eq('voter_id', user.id);

      if (error) throw error;
      return data as EOPVote[];
    },
    enabled: !!user,
  });
}

export function useVoteCounts() {
  return useQuery({
    queryKey: ['eop-vote-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_votes')
        .select('candidate_id, vote');

      if (error) throw error;
      
      // Aggregate votes by candidate
      const counts: Record<string, { yes: number; no: number; abstain: number; total: number }> = {};
      
      data.forEach((vote) => {
        if (!counts[vote.candidate_id]) {
          counts[vote.candidate_id] = { yes: 0, no: 0, abstain: 0, total: 0 };
        }
        counts[vote.candidate_id][vote.vote]++;
        counts[vote.candidate_id].total++;
      });
      
      return counts;
    },
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidate_id, vote }: { candidate_id: string; vote: VoteType }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if already voted
      const { data: existing } = await supabase
        .from('eop_votes')
        .select('id')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidate_id)
        .single();

      if (existing) {
        throw new Error('You have already voted for this candidate');
      }
      
      const { data, error } = await supabase
        .from('eop_votes')
        .insert({ voter_id: user.id, candidate_id, vote })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-eop-votes'] });
      queryClient.invalidateQueries({ queryKey: ['eop-vote-counts'] });
      toast.success('Vote cast successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
