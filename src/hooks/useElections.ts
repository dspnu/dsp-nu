import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      const { error } = await supabase.from('elections').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Election status updated');
      qc.invalidateQueries({ queryKey: ['elections'] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election-candidates'] });
    },
    onError: () => toast.error('Failed to add candidate'),
  });
}

export function useDeleteElectionCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('election_candidates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election-candidates'] });
    },
    onError: () => toast.error('Failed to remove candidate'),
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { position_id: string; candidate_id: string; voter_id: string }) => {
      // Upsert: if voter already voted for this position, update
      const { error } = await supabase
        .from('election_votes')
        .upsert(values, { onConflict: 'position_id,voter_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vote cast');
      qc.invalidateQueries({ queryKey: ['election-votes'] });
      qc.invalidateQueries({ queryKey: ['my-election-votes'] });
    },
    onError: () => toast.error('Failed to cast vote'),
  });
}
