import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { hasPosition, isChapterOps } from '@/config/org';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';
import { pingSupabaseHealth, isHealthSlow } from '@/lib/supabaseHealth';

type EOPCandidate = Tables<'eop_candidates'>;
type VoteType = Enums<'eop_vote'>;

export interface VoteCounts {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

/** Count-only ready status (no peer user id list). */
export type ReadyAgg = { count: number; iAmReady: boolean };

type PgPayload = {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

const READY_POLL_MS = 2500;
export const EOP_READY_COOLDOWN_MS = 5000;

function parseVoteRow(r: Record<string, unknown> | null): { candidate_id: string; vote: VoteType } | null {
  if (!r || typeof r.candidate_id !== 'string') return null;
  const v = r.vote;
  if (v !== 'yes' && v !== 'no' && v !== 'abstain') return null;
  return { candidate_id: r.candidate_id, vote: v };
}

function parseCandidateRow(r: Record<string, unknown> | null): EOPCandidate | null {
  if (!r || typeof r.id !== 'string') return null;
  return r as unknown as EOPCandidate;
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

function applyCandidatePayload(
  prev: EOPCandidate[] | undefined,
  payload: PgPayload
): EOPCandidate[] | undefined {
  if (!prev) return prev;
  const { eventType, new: n, old: o } = payload;

  if (eventType === 'INSERT') {
    const row = parseCandidateRow(n);
    if (!row) return prev;
    if (prev.some((c) => c.id === row.id)) return prev;
    return [...prev, row].sort((a, b) => a.last_name.localeCompare(b.last_name));
  }

  if (eventType === 'DELETE') {
    const id = o && typeof o.id === 'string' ? o.id : null;
    if (!id) return prev;
    return prev.filter((c) => c.id !== id);
  }

  if (eventType === 'UPDATE') {
    const row = parseCandidateRow(n);
    if (!row) return prev;
    return prev.map((c) => (c.id === row.id ? { ...c, ...row } : c));
  }

  return prev;
}

export function useIsVPChapterOps() {
  const { profile, isAdminOrOfficer } = useAuth();
  const isVPChapterOps = isChapterOps(profile) || hasPosition(profile, 'President');
  return { isVPChapterOps, isAdminOrOfficer };
}

export function useRealtimeCandidates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['eop-candidates-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .select(
          'id, first_name, last_name, picture_url, voting_open, absent_members, created_at, updated_at, email, phone, notes, eligible_voters'
        )
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as EOPCandidate[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('eop-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eop_candidates' },
        (payload: PgPayload) => {
          queryClient.setQueryData<EOPCandidate[]>(['eop-candidates-realtime'], (past) => {
            if (past === undefined) {
              void queryClient.invalidateQueries({ queryKey: ['eop-candidates-realtime'] });
              return past;
            }
            return applyCandidatePayload(past, payload) ?? past;
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

/** Vote tallies via RPC + optional Realtime patch — officers/VP only. */
export function useRealtimeVoteCounts(enabled = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['eop-vote-counts-realtime'],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_eop_vote_counts', {
        p_candidate_id: null,
      });

      if (error) throw error;

      const counts: Record<string, VoteCounts> = {};
      ((data ?? []) as any[]).forEach((row: any) => {
        counts[row.candidate_id] = {
          yes: Number(row.yes) || 0,
          no: Number(row.no) || 0,
          abstain: Number(row.abstain) || 0,
          total: Number(row.total) || 0,
        };
      });
      return counts;
    },
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('eop-votes-officer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eop_votes' },
        (payload: PgPayload) => {
          queryClient.setQueryData<Record<string, VoteCounts>>(['eop-vote-counts-realtime'], (past) => {
            if (past === undefined) {
              void queryClient.invalidateQueries({ queryKey: ['eop-vote-counts-realtime'] });
              return past;
            }
            return applyEopVoteRealtimePayload(past, payload) ?? past;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return query;
}

export function useMyVoteForCandidate(candidateId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-eop-vote-realtime', candidateId, user?.id],
    queryFn: async () => {
      if (!user || !candidateId) return null;

      const { data, error } = await supabase
        .from('eop_votes')
        .select('id, candidate_id, voter_id, vote, created_at')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!candidateId,
  });
}

/** Ready status via count RPC (no user id list). */
export function usePolledReadyCounts(activeCandidateId?: string | null) {
  const poll = !!activeCandidateId;

  return useQuery({
    queryKey: ['eop-ready-counts-polled', activeCandidateId ?? 'none'],
    enabled: poll,
    refetchInterval: poll ? READY_POLL_MS : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      if (!activeCandidateId) return {} as Record<string, ReadyAgg>;

      const { data, error } = await (supabase.rpc as any)('get_eop_ready_status', {
        p_candidate_id: activeCandidateId,
      });

      if (error) throw error;
      const row = data?.[0];
      return {
        [activeCandidateId]: {
          count: Number(row?.ready_count) || 0,
          iAmReady: !!row?.i_am_ready,
        },
      } satisfies Record<string, ReadyAgg>;
    },
    placeholderData: (previous) => previous,
  });
}

/** @deprecated Use usePolledReadyCounts */
export const useRealtimeReadyCounts = usePolledReadyCounts;

export function useToggleReady() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, isReady }: { candidateId: string; isReady: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isReady) {
        const { error } = await supabase
          .from('eop_ready')
          .delete()
          .eq('candidate_id', candidateId)
          .eq('user_id', user.id);

        if (error) throw error;
        return { candidateId, ready: false };
      }

      const { error } = await supabase
        .from('eop_ready')
        .insert({ candidate_id: candidateId, user_id: user.id });

      if (error) {
        if (error.code === '23505') {
          return { candidateId, ready: true };
        }
        throw error;
      }
      return { candidateId, ready: true };
    },
    onSuccess: ({ candidateId, ready }) => {
      queryClient.setQueryData<Record<string, ReadyAgg>>(
        ['eop-ready-counts-polled', candidateId],
        (past) => {
          const cur = past?.[candidateId] ?? { count: 0, iAmReady: false };
          let count = cur.count;
          if (ready && !cur.iAmReady) count += 1;
          if (!ready && cur.iAmReady) count = Math.max(0, count - 1);
          return {
            ...(past ?? {}),
            [candidateId]: { count, iAmReady: ready },
          };
        }
      );
    },
    onError: (error) => {
      toast.error('Failed to update ready status: ' + error.message);
    },
  });
}

export function useCastVoteRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, vote }: { candidateId: string; vote: VoteType }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase.rpc as any)('cast_eop_vote', {
        p_candidate_id: candidateId,
        p_vote: vote,
      });

      if (error) {
        if (error.message?.includes('already voted') || error.code === '23505') {
          throw new Error('You have already voted for this candidate');
        }
        throw error;
      }
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

export function useChangeVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, vote }: { candidateId: string; vote: VoteType }) => {
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('eop_votes')
        .delete()
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId);

      if (deleteError) throw deleteError;

      const { data, error } = await (supabase.rpc as any)('cast_eop_vote', {
        p_candidate_id: candidateId,
        p_vote: vote,
      });

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

export function useToggleVotingRealtime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, votingOpen }: { id: string; votingOpen: boolean }) => {
      if (votingOpen) {
        const health = await pingSupabaseHealth();
        if (isHealthSlow(health)) {
          throw new Error(
            `Connection looks slow (${health.latencyMs}ms). Wait a moment before opening voting.`
          );
        }

        const { error: closeError } = await supabase
          .from('eop_candidates')
          .update({ voting_open: false })
          .eq('voting_open', true)
          .neq('id', id);

        if (closeError) throw closeError;

        await supabase.from('eop_ready').delete().eq('candidate_id', id);
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
    onSuccess: (data, { votingOpen, id }) => {
      queryClient.setQueryData<EOPCandidate[]>(['eop-candidates-realtime'], (past) => {
        if (!past) return past;
        return past.map((c) => {
          if (c.id === id) return { ...c, ...data };
          if (votingOpen && c.voting_open) return { ...c, voting_open: false };
          return c;
        });
      });
      void queryClient.invalidateQueries({ queryKey: ['eop-ready-counts-polled'] });
      toast.success(votingOpen ? 'Voting opened' : 'Voting closed');
    },
    onError: (error) => {
      toast.error('Failed to toggle voting: ' + error.message);
    },
  });
}

export function useClearVotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from('eop_votes')
        .delete()
        .eq('candidate_id', candidateId);

      if (error) throw error;
      return candidateId;
    },
    onSuccess: (candidateId) => {
      void queryClient.invalidateQueries({ queryKey: ['my-eop-vote-realtime'] });
      queryClient.setQueryData<Record<string, VoteCounts>>(['eop-vote-counts-realtime'], (past) => {
        if (!past) return past;
        const next = { ...past };
        delete next[candidateId];
        return next;
      });
      toast.success('Votes cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear votes: ' + error.message);
    },
  });
}

export function useReadyCooldown(ms = EOP_READY_COOLDOWN_MS) {
  const untilRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (untilRef.current <= Date.now()) return;
    const id = window.setTimeout(() => setTick((n) => n + 1), untilRef.current - Date.now());
    return () => window.clearTimeout(id);
  }, [tick]);

  const remainingMs = Math.max(0, untilRef.current - Date.now());
  const isCoolingDown = remainingMs > 0;

  const startCooldown = () => {
    untilRef.current = Date.now() + ms;
    setTick((n) => n + 1);
  };

  return {
    isCoolingDown,
    remainingSec: Math.ceil(remainingMs / 1000),
    startCooldown,
  };
}
