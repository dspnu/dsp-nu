import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

type PgPayload = {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

function parseElectionVoteRow(r: Record<string, unknown> | null): ElectionVote | null {
  if (
    !r ||
    typeof r.id !== 'string' ||
    typeof r.position_id !== 'string' ||
    typeof r.candidate_id !== 'string' ||
    typeof r.voter_id !== 'string' ||
    typeof r.created_at !== 'string'
  ) {
    return null;
  }
  return {
    id: r.id,
    position_id: r.position_id,
    candidate_id: r.candidate_id,
    voter_id: r.voter_id,
    created_at: r.created_at,
  };
}

function applyElectionVotesRealtime(
  prev: ElectionVote[] | undefined,
  payload: PgPayload,
  allowed: Set<string>
): ElectionVote[] | undefined {
  if (!prev) return prev;

  const inScope = (row: ElectionVote | null) => !!row && allowed.has(row.position_id);

  if (payload.eventType === 'INSERT') {
    const row = parseElectionVoteRow(payload.new);
    if (!inScope(row)) return prev;
    if (prev.some((v) => v.id === row!.id)) return prev;
    return [...prev, row!];
  }
  if (payload.eventType === 'DELETE') {
    const row = parseElectionVoteRow(payload.old);
    if (!inScope(row)) return prev;
    return prev.filter((v) => v.id !== row!.id);
  }
  if (payload.eventType === 'UPDATE') {
    const oldRow = parseElectionVoteRow(payload.old);
    const newRow = parseElectionVoteRow(payload.new);
    let next = prev;
    if (oldRow && inScope(oldRow)) {
      next = next.filter((v) => v.id !== oldRow.id);
    }
    if (newRow && inScope(newRow)) {
      next = next.filter(
        (v) => !(v.position_id === newRow.position_id && v.voter_id === newRow.voter_id)
      );
      return [...next, newRow];
    }
    return next;
  }
  return prev;
}

function applyMyElectionVotesRealtime(
  prev: ElectionVote[] | undefined,
  payload: PgPayload,
  allowed: Set<string>,
  myUserId: string
): ElectionVote[] | undefined {
  if (!prev) return prev;

  const touchesMe = (row: ElectionVote | null) =>
    !!row && row.voter_id === myUserId && allowed.has(row.position_id);

  if (payload.eventType === 'INSERT') {
    const row = parseElectionVoteRow(payload.new);
    if (!touchesMe(row)) return prev;
    const without = prev.filter((v) => v.position_id !== row!.position_id);
    return [...without, row!];
  }
  if (payload.eventType === 'DELETE') {
    const row = parseElectionVoteRow(payload.old);
    if (!touchesMe(row)) return prev;
    return prev.filter((v) => v.id !== row!.id);
  }
  if (payload.eventType === 'UPDATE') {
    const newRow = parseElectionVoteRow(payload.new);
    const oldRow = parseElectionVoteRow(payload.old);
    if (touchesMe(newRow)) {
      const without = prev.filter((v) => v.position_id !== newRow!.position_id);
      return [...without, newRow!];
    }
    if (touchesMe(oldRow)) {
      return prev.filter((v) => v.id !== oldRow!.id);
    }
    return prev;
  }
  return prev;
}

function invalidateElectionCandidatesForPosition(qc: QueryClient, positionId: string) {
  qc.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === 'election-candidates' &&
      Array.isArray(q.queryKey[1]) &&
      (q.queryKey[1] as string[]).includes(positionId),
  });
}

/** Stable query key + Realtime channel id: avoids busting cache when `positions` is a new array reference with the same ids. */
export function useStableSortedPositionIds(positions: { id: string }[] | undefined): string[] {
  const signature = (positions ?? [])
    .map((p) => p.id)
    .sort()
    .join('|');
  return useMemo(() => (signature ? signature.split('|') : []), [signature]);
}

export function useElections() {
  return useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Election[];
    },
  });
}

export function useElectionPositions(electionId?: string) {
  return useQuery({
    queryKey: ['election-positions', electionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('election_positions')
        .select('*')
        .eq('election_id', electionId!)
        .order('sort_order');
      if (error) throw error;
      return data as ElectionPosition[];
    },
    enabled: !!electionId,
  });
}

export function useElectionCandidates(positionIds?: string[]) {
  return useQuery({
    queryKey: ['election-candidates', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('election_candidates')
        .select('*')
        .in('position_id', positionIds);
      if (error) throw error;
      return data as ElectionCandidate[];
    },
    enabled: !!positionIds && positionIds.length > 0,
  });
}

export function useElectionVotes(positionIds?: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!positionIds || positionIds.length === 0) return;
    const allowed = new Set(positionIds);
    const channelId = `election-votes-${[...positionIds].sort().join('-')}`.slice(0, 180);
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'election_votes' },
        (payload: PgPayload) => {
          const keyVotes = ['election-votes', positionIds] as const;
          queryClient.setQueryData<ElectionVote[]>(keyVotes, (past) => {
            if (past === undefined) {
              void queryClient.invalidateQueries({ queryKey: keyVotes });
              return past;
            }
            return applyElectionVotesRealtime(past, payload, allowed) ?? past;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, positionIds]);

  return useQuery({
    queryKey: ['election-votes', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('election_votes')
        .select('*')
        .in('position_id', positionIds);
      if (error) throw error;
      return data as ElectionVote[];
    },
    enabled: !!positionIds && positionIds.length > 0,
  });
}

export function useMyElectionVotes(positionIds?: string[]) {
  const queryClient = useQueryClient();

  // Members use this hook without useElectionVotes; they still need Realtime to merge peers' visible state is N/A,
  // but their own row must update from upsert + from events for multi-tab consistency.
  useEffect(() => {
    if (!positionIds || positionIds.length === 0) return;
    const allowed = new Set(positionIds);
    const channelId = `election-my-votes-${[...positionIds].sort().join('-')}`.slice(0, 180);
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'election_votes' },
        (payload: PgPayload) => {
          void supabase.auth.getSession().then(({ data: { session } }) => {
            const uid = session?.user?.id;
            if (!uid) return;
            const keyMine = ['my-election-votes', positionIds] as const;
            queryClient.setQueryData<ElectionVote[]>(keyMine, (past) => {
              if (past === undefined) {
                void queryClient.invalidateQueries({ queryKey: keyMine });
                return past;
              }
              return applyMyElectionVotesRealtime(past, payload, allowed, uid) ?? past;
            });
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, positionIds]);

  return useQuery({
    queryKey: ['my-election-votes', positionIds],
    queryFn: async () => {
      if (!positionIds || positionIds.length === 0) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('election_votes')
        .select('*')
        .in('position_id', positionIds)
        .eq('voter_id', user.id);
      if (error) throw error;
      return data as ElectionVote[];
    },
    enabled: !!positionIds && positionIds.length > 0,
  });
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
      // When publishing, deactivate all positions so VP must open each manually
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
      const { error } = await supabase.from('election_positions').update({ is_active }).eq('id', id);
      if (error) throw error;
      return election_id;
    },
    onSuccess: (electionId) => {
      qc.invalidateQueries({ queryKey: ['election-positions', electionId] });
    },
    onError: () => toast.error('Failed to toggle position'),
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
      const { data, error } = await supabase
        .from('election_votes')
        .upsert(values, { onConflict: 'position_id,voter_id' })
        .select()
        .single();
      if (error) throw error;
      return data as ElectionVote;
    },
    onSuccess: (data) => {
      qc.setQueriesData<ElectionVote[]>({ queryKey: ['my-election-votes'] }, (prev, query) => {
        const ids = query.queryKey[1];
        if (!Array.isArray(ids) || !ids.includes(data.position_id)) return prev;
        return mergeMyElectionVotesCache(prev, data);
      });
      qc.setQueriesData<ElectionVote[]>({ queryKey: ['election-votes'] }, (prev, query) => {
        const ids = query.queryKey[1];
        if (!Array.isArray(ids) || !ids.includes(data.position_id)) return prev;
        if (prev === undefined) {
          void qc.invalidateQueries({ queryKey: query.queryKey });
          return prev;
        }
        return mergeElectionVotesListFromUpsert(prev, data);
      });
      toast.success('Vote cast');
    },
    onError: () => toast.error('Failed to cast vote'),
  });
}

function mergeElectionVotesListFromUpsert(prev: ElectionVote[], row: ElectionVote): ElectionVote[] {
  const without = prev.filter(
    (v) => !(v.position_id === row.position_id && v.voter_id === row.voter_id)
  );
  return [...without, row];
}
