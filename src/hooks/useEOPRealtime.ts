import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type EOPCandidate = Tables<'eop_candidates'>;
type VoteType = Enums<'eop_vote'>;

interface VoteCounts {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

// Check if user has VP of Chapter Operations position
export function useIsVPChapterOps() {
  const { profile, isAdminOrOfficer } = useAuth();
  const isVPChapterOps = profile?.positions?.includes('VP of Chapter Operations') || false;
  return { isVPChapterOps, isAdminOrOfficer };
}

// Realtime candidates hook
export function useRealtimeCandidates() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['eop-candidates-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as EOPCandidate[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('eop-candidates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eop_candidates' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['eop-candidates-realtime'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Realtime vote counts hook
export function useRealtimeVoteCounts() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['eop-vote-counts-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_votes')
        .select('candidate_id, vote');

      if (error) throw error;
      
      const counts: Record<string, VoteCounts> = {};
      
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

  useEffect(() => {
    const channel = supabase
      .channel('eop-votes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eop_votes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['eop-vote-counts-realtime'] });
          queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Current user's vote for a specific candidate
export function useMyVoteForCandidate(candidateId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-eop-vote-realtime', candidateId, user?.id],
    queryFn: async () => {
      if (!user || !candidateId) return null;
      
      const { data, error } = await supabase
        .from('eop_votes')
        .select('*')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!candidateId,
  });
}

// Realtime ready counts hook
export function useRealtimeReadyCounts() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['eop-ready-counts-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_ready')
        .select('candidate_id, user_id');

      if (error) throw error;
      
      const counts: Record<string, { count: number; userIds: string[] }> = {};
      
      data.forEach((ready) => {
        if (!counts[ready.candidate_id]) {
          counts[ready.candidate_id] = { count: 0, userIds: [] };
        }
        counts[ready.candidate_id].count++;
        counts[ready.candidate_id].userIds.push(ready.user_id);
      });
      
      return counts;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('eop-ready-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eop_ready' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['eop-ready-counts-realtime'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Toggle ready status
export function useToggleReady() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, isReady }: { candidateId: string; isReady: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isReady) {
        // Remove ready status
        const { error } = await supabase
          .from('eop_ready')
          .delete()
          .eq('candidate_id', candidateId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Add ready status
        const { error } = await supabase
          .from('eop_ready')
          .insert({ candidate_id: candidateId, user_id: user.id });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eop-ready-counts-realtime'] });
    },
    onError: (error) => {
      toast.error('Failed to update ready status: ' + error.message);
    },
  });
}

// Cast vote mutation
export function useCastVoteRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, vote }: { candidateId: string; vote: VoteType }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if already voted
      const { data: existing } = await supabase
        .from('eop_votes')
        .select('id')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (existing) {
        throw new Error('You have already voted for this candidate');
      }
      
      const { data, error } = await supabase
        .from('eop_votes')
        .insert({ voter_id: user.id, candidate_id: candidateId, vote })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime'] });
      queryClient.invalidateQueries({ queryKey: ['eop-vote-counts-realtime'] });
      toast.success('Vote submitted!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Toggle voting open/close (VP only)
export function useToggleVotingRealtime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, votingOpen }: { id: string; votingOpen: boolean }) => {
      // If opening voting, first close all other candidates
      if (votingOpen) {
        const { error: closeError } = await supabase
          .from('eop_candidates')
          .update({ voting_open: false })
          .neq('id', id);
        
        if (closeError) throw closeError;
        
        // Clear ready statuses for this candidate when opening
        await supabase
          .from('eop_ready')
          .delete()
          .eq('candidate_id', id);
      }
      
      const { data, error } = await supabase
        .from('eop_candidates')
        .update({ voting_open: votingOpen })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { votingOpen }) => {
      queryClient.invalidateQueries({ queryKey: ['eop-candidates-realtime'] });
      queryClient.invalidateQueries({ queryKey: ['eop-ready-counts-realtime'] });
      toast.success(votingOpen ? 'Voting opened' : 'Voting closed');
    },
    onError: (error) => {
      toast.error('Failed to toggle voting: ' + error.message);
    },
  });
}

// Clear votes for a candidate (VP only - for resetting)
export function useClearVotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from('eop_votes')
        .delete()
        .eq('candidate_id', candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eop-vote-counts-realtime'] });
      queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime'] });
      toast.success('Votes cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear votes: ' + error.message);
    },
  });
}
