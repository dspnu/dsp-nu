import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { isChapterOps } from '@/config/org';
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

type ReadyAgg = { count: number; userIds: string[] };

type PgPayload = {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

function parseVoteRow(r: Record<string, unknown> | null): { candidate_id: string; vote: VoteType } | null {
  if (!r || typeof r.candidate_id !== 'string') return null;
  const v = r.vote;
  if (v !== 'yes' && v !== 'no' && v !== 'abstain') return null;
  return { candidate_id: r.candidate_id, vote: v };
}

function bumpVoteCount(
  prev: Record<string, VoteCounts>,
  candidateId: string,
  vote: VoteType,
  delta: number
): Record<string, VoteCounts> {
  const c = prev[candidateId] ?? { yes: 0, no: 0, abstain: 0, total: 0 };
  return {
    ...prev,
    [candidateId]: {
      ...c,
      [vote]: Math.max(0, c[vote] + delta),
      total: Math.max(0, c.total + delta),
    },
  };
}

function applyEopVoteRealtimePayload(
  prev: Record<string, VoteCounts> | undefined,
  payload: PgPayload
): Record<string, VoteCounts> | undefined {
  if (!prev) return prev;
  const { eventType, new: n, old: o } = payload;
  if (eventType === 'INSERT') {
    const row = parseVoteRow(n);
    return row ? bumpVoteCount(prev, row.candidate_id, row.vote, 1) : prev;
  }
  if (eventType === 'DELETE') {
    const row = parseVoteRow(o);
    return row ? bumpVoteCount(prev, row.candidate_id, row.vote, -1) : prev;
  }
  if (eventType === 'UPDATE') {
    let next = prev;
    const oldRow = parseVoteRow(o);
    if (oldRow) next = bumpVoteCount(next, oldRow.candidate_id, oldRow.vote, -1);
    const newRow = parseVoteRow(n);
    if (newRow) next = bumpVoteCount(next, newRow.candidate_id, newRow.vote, 1);
    return next;
  }
  return prev;
}

function applyEopReadyRealtimePayload(
  prev: Record<string, ReadyAgg> | undefined,
  payload: PgPayload
): Record<string, ReadyAgg> | undefined {
  if (!prev) return prev;
  const { eventType, new: n, old: o } = payload;
  if (eventType === 'INSERT') {
    const c = n && typeof n.candidate_id === 'string' ? n.candidate_id : null;
    const u = n && typeof n.user_id === 'string' ? n.user_id : null;
    if (!c || !u) return prev;
    const cur = prev[c] ?? { count: 0, userIds: [] };
    if (cur.userIds.includes(u)) return prev;
    return {
      ...prev,
      [c]: { count: cur.count + 1, userIds: [...cur.userIds, u] },
    };
  }
  if (eventType === 'DELETE') {
    const c = o && typeof o.candidate_id === 'string' ? o.candidate_id : null;
    const u = o && typeof o.user_id === 'string' ? o.user_id : null;
    if (!c || !u) return prev;
    const cur = prev[c];
    if (!cur) return prev;
    const userIds = cur.userIds.filter((x) => x !== u);
    return {
      ...prev,
      [c]: { count: userIds.length, userIds },
    };
  }
  return prev;
}

export function useIsVPChapterOps() {
  const { profile, isAdminOrOfficer } = useAuth();
  const isVPChapterOps = isChapterOps(profile);
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
        (payload: PgPayload) => {
          queryClient.setQueryData(['eop-vote-counts-realtime'], (past) => {
            if (past === undefined) {
              void queryClient.invalidateQueries({ queryKey: ['eop-vote-counts-realtime'] });
              return past;
            }
            return applyEopVoteRealtimePayload(past, payload) ?? past;
          });
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          const candId = row && typeof row.candidate_id === 'string' ? row.candidate_id : null;
          const voterId = row && typeof row.voter_id === 'string' ? row.voter_id : null;
          if (candId && voterId) {
            void queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime', candId, voterId] });
          }
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
      
      const counts: Record<string, ReadyAgg> = {};
      
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
        (payload: PgPayload) => {
          queryClient.setQueryData(['eop-ready-counts-realtime'], (past) => {
            if (past === undefined) {
              void queryClient.invalidateQueries({ queryKey: ['eop-ready-counts-realtime'] });
              return past;
            }
            return applyEopReadyRealtimePayload(past, payload) ?? past;
          });
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
    onSuccess: (data, { candidateId }) => {
      if (user) {
        queryClient.setQueryData(['my-eop-vote-realtime', candidateId, user.id], data);
      }
      toast.success('Vote submitted!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Change vote mutation (update existing vote)
export function useChangeVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, vote }: { candidateId: string; vote: VoteType }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete existing vote first
      const { error: deleteError } = await supabase
        .from('eop_votes')
        .delete()
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId);

      if (deleteError) throw deleteError;
      
      // Insert new vote
      const { data, error } = await supabase
        .from('eop_votes')
        .insert({ voter_id: user.id, candidate_id: candidateId, vote })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { candidateId }) => {
      if (user) {
        queryClient.setQueryData(['my-eop-vote-realtime', candidateId, user.id], data);
      }
      toast.success('Vote changed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to change vote: ' + error.message);
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
      void queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime'] });
      toast.success('Votes cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear votes: ' + error.message);
    },
  });
}
