import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { toast } from 'sonner';
import { pingSupabaseHealth, isHealthSlow } from '@/lib/supabaseHealth';
import { enterMeetingMode, exitMeetingMode } from '@/lib/meetingMode';

export interface Election {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'open' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ElectionPosition {
  id: string;
  election_id: string;
  position_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ElectionCandidate {
  id: string;
  position_id: string;
  candidate_name: string;
  candidate_user_id: string | null;
  created_at: string;
}

export interface ElectionVote {
  id: string;
  position_id: string;
  candidate_id: string;
  voter_id: string;
  created_at: string;
}

export type ElectionVoteTally = {
  position_id: string;
  candidate_id: string;
  vote_count: number;
};

const ELECTION_META_POLL_MS = 3000;
const ELECTION_RESULTS_POLL_MS = 2000;

function invalidateElectionCandidatesForPosition(qc: QueryClient, positionId: string) {
  qc.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === 'election-candidates' &&
      Array.isArray(q.queryKey[1]) &&
      (q.queryKey[1] as string[]).includes(positionId),
  });
}

export function useStableSortedPositionIds(positions: { id: string }[] | undefined): string[] {
  const signature = (positions ?? [])
    .map((p) => p.id)
    .sort()
    .join('|');
  return useMemo(() => (signature ? signature.split('|') : []), [signature]);
}

export function useElections(options?: { pollWhenOpen?: boolean }) {
  const pollWhenOpen = options?.pollWhenOpen ?? false;

  return useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elections')
        .select('id, title, description, status, created_by, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Election[];
    },
    refetchInterval: (q) => {
      if (!pollWhenOpen) return false;
      const rows = q.state.data as Election[] | undefined;
      return rows?.some((e) => e.status === 'open') ? ELECTION_META_POLL_MS : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useElectionPositions(electionId?: string, options?: { pollWhileMounted?: boolean }) {
  const poll = options?.pollWhileMounted ?? false;

  return useQuery({
    queryKey: ['election-positions', electionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('election_positions')
        .select('id, election_id, position_name, sort_order, is_active, created_at')
        .eq('election_id', electionId!)
        .order('sort_order');
      if (error) throw error;
      return data as ElectionPosition[];
    },
    enabled: !!electionId,
    refetchInterval: poll && electionId ? ELECTION_META_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useElectionCandidates(positionIds?: string[]) {
  return useQuery({
    queryKey: ['election-candidates', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('election_candidates')
        .select('id, position_id, candidate_name, candidate_user_id, created_at')
        .in('position_id', positionIds);
      if (error) throw error;
      return data as ElectionCandidate[];
    },
    enabled: !!positionIds && positionIds.length > 0,
  });
}

/** Aggregated tallies via RPC (no full vote row download). */
export function useElectionVoteTallies(positionIds?: string[], options?: { pollMs?: number }) {
  const pollMs = options?.pollMs ?? ELECTION_RESULTS_POLL_MS;

  return useQuery({
    queryKey: ['election-vote-tallies', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) {
        return { tallies: [] as ElectionVoteTally[], uniqueVoters: 0 };
      }
      const [countsRes, votersRes] = await Promise.all([
        supabase.rpc('get_election_vote_counts', { p_position_ids: positionIds }),
        supabase.rpc('get_election_unique_voters', { p_position_ids: positionIds }),
      ]);
      if (countsRes.error) throw countsRes.error;
      if (votersRes.error) throw votersRes.error;
      return {
        tallies: (countsRes.data ?? []).map((r) => ({
          position_id: r.position_id,
          candidate_id: r.candidate_id,
          vote_count: Number(r.vote_count) || 0,
        })),
        uniqueVoters: Number(votersRes.data) || 0,
      };
    },
    enabled: !!positionIds && positionIds.length > 0,
    refetchInterval: positionIds && positionIds.length > 0 ? pollMs : false,
    refetchIntervalInBackground: false,
  });
}

/** @deprecated Prefer useElectionVoteTallies for admin results. */
export function useElectionVotes(positionIds?: string[], options?: { pollMs?: number }) {
  const pollMs = options?.pollMs ?? ELECTION_RESULTS_POLL_MS;

  return useQuery({
    queryKey: ['election-votes', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('election_votes')
        .select('id, position_id, candidate_id, voter_id, created_at')
        .in('position_id', positionIds);
      if (error) throw error;
      return data as ElectionVote[];
    },
    enabled: !!positionIds && positionIds.length > 0,
    refetchInterval: positionIds && positionIds.length > 0 ? pollMs : false,
    refetchIntervalInBackground: false,
  });
}

export function useMyElectionVotes(positionIds?: string[]) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const keyMine = ['my-election-votes', uid, positionIds] as const;

  return useQuery({
    queryKey: keyMine,
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0 || !uid) return [];
      const { data, error } = await supabase
        .from('election_votes')
        .select('id, position_id, candidate_id, voter_id, created_at')
        .in('position_id', positionIds)
        .eq('voter_id', uid);
      if (error) throw error;
      return data as ElectionVote[];
    },
    enabled: !!uid && !!positionIds && positionIds.length > 0,
  });
}

/** Hold meeting mode while any election is open (home ballot / admin). */
export function useElectionMeetingMode(active: boolean) {
  useEffect(() => {
    if (!active) return;
    enterMeetingMode();
    return () => exitMeetingMode();
  }, [active]);
}

export function useCreateElection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { title: string; description?: string; created_by: string }) => {
      const { data, error } = await supabase.from('elections').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Election created');
      qc.invalidateQueries({ queryKey: ['elections'] });
    },
    onError: () => toast.error('Failed to create election'),
  });
}

export function useUpdateElectionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'open' | 'closed' }) => {
      if (status === 'open') {
        const { error: posError } = await supabase
          .from('election_positions')
          .update({ is_active: false })
          .eq('election_id', id);
        if (posError) throw posError;
      }
      const { error } = await supabase.from('elections').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      toast.success('Election status updated');
      qc.invalidateQueries({ queryKey: ['elections'] });
      qc.invalidateQueries({ queryKey: ['election-positions', id] });
    },
    onError: () => toast.error('Failed to update election'),
  });
}

export function useDeleteElection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('elections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Election deleted');
      qc.invalidateQueries({ queryKey: ['elections'] });
    },
    onError: () => toast.error('Failed to delete election'),
  });
}

export function useAddElectionPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { election_id: string; position_name: string; sort_order: number }) => {
      const { data, error } = await supabase.from('election_positions').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['election-positions', vars.election_id] });
    },
    onError: () => toast.error('Failed to add position'),
  });
}

export function useDeleteElectionPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, electionId }: { id: string; electionId: string }) => {
      const { error } = await supabase.from('election_positions').delete().eq('id', id);
      if (error) throw error;
      return electionId;
    },
    onSuccess: (electionId) => {
      qc.invalidateQueries({ queryKey: ['election-positions', electionId] });
    },
    onError: () => toast.error('Failed to delete position'),
  });
}

export function useAddElectionCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { position_id: string; candidate_name: string; candidate_user_id?: string }) => {
      const { error } = await supabase.from('election_candidates').insert(values);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidateElectionCandidatesForPosition(qc, vars.position_id);
    },
    onError: () => toast.error('Failed to add candidate'),
  });
}

export function useDeleteElectionCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row, error: selErr } = await supabase
        .from('election_candidates')
        .select('position_id')
        .eq('id', id)
        .maybeSingle();
      if (selErr) throw selErr;
      const { error } = await supabase.from('election_candidates').delete().eq('id', id);
      if (error) throw error;
      return row?.position_id ?? null;
    },
    onSuccess: (positionId) => {
      if (positionId) invalidateElectionCandidatesForPosition(qc, positionId);
      else qc.invalidateQueries({ queryKey: ['election-candidates'] });
    },
    onError: () => toast.error('Failed to remove candidate'),
  });
}

export function useTogglePositionActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
      election_id,
    }: {
      id: string;
      is_active: boolean;
      election_id: string;
    }) => {
      if (is_active) {
        const health = await pingSupabaseHealth();
        if (isHealthSlow(health)) {
          throw new Error(
            `Connection looks slow (${health.latencyMs}ms). Wait a moment before opening the next position.`
          );
        }
        // One position at a time
        const { error: closeError } = await supabase
          .from('election_positions')
          .update({ is_active: false })
          .eq('election_id', election_id)
          .eq('is_active', true)
          .neq('id', id);
        if (closeError) throw closeError;
      }

      const { error } = await supabase.from('election_positions').update({ is_active }).eq('id', id);
      if (error) throw error;
      return election_id;
    },
    onSuccess: (electionId) => {
      qc.invalidateQueries({ queryKey: ['election-positions', electionId] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to toggle position'),
  });
}

function mergeMyElectionVotesCache(prev: ElectionVote[] | undefined, row: ElectionVote): ElectionVote[] {
  const without = (prev ?? []).filter((v) => v.position_id !== row.position_id);
  return [...without, row];
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { position_id: string; candidate_id: string; voter_id: string }) => {
      const { data, error } = await supabase.rpc('cast_election_vote', {
        p_position_id: values.position_id,
        p_candidate_id: values.candidate_id,
      });
      if (error) throw error;
      return data as ElectionVote;
    },
    onSuccess: (data) => {
      for (const [key, prev] of qc.getQueriesData<ElectionVote[]>({ queryKey: ['my-election-votes'] })) {
        const ids = key[2];
        if (!Array.isArray(ids) || !ids.includes(data.position_id)) continue;
        qc.setQueryData(key, mergeMyElectionVotesCache(prev, data));
      }
      void qc.invalidateQueries({ queryKey: ['election-vote-tallies'] });
      toast.success('Vote cast');
    },
    onError: () => toast.error('Failed to cast vote'),
  });
}
