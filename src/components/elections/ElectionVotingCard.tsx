import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, CheckCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useElections, useElectionPositions, useElectionCandidates,
  useMyElectionVotes, useCastVote,
  Election,
} from '@/hooks/useElections';

function VotingSection({ election }: { election: Election }) {
  const { user } = useAuth();
  const { data: positions = [] } = useElectionPositions(election.id);
  const positionIds = useMemo(() => positions.map(p => p.id), [positions]);
  const { data: candidates = [] } = useElectionCandidates(positionIds);
  const { data: myVotes = [] } = useMyElectionVotes(positionIds);
  const castVote = useCastVote();

  const handleVote = (positionId: string, candidateId: string) => {
    if (!user) return;
    castVote.mutate({ position_id: positionId, candidate_id: candidateId, voter_id: user.id });
  };

  const activePositions = positions.filter(p => p.is_active);
  const allVoted = activePositions.length > 0 && activePositions.every(p => myVotes.some(v => v.position_id === p.id));

  return (
    <Card className={`border ${allVoted ? 'border-green-500/30 bg-green-500/5' : 'border-primary/20'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Vote className="h-4 w-4 text-primary" />
            {election.title}
          </CardTitle>
          {allVoted ? (
            <Badge className="bg-green-500/20 text-green-700 gap-1">
              <CheckCircle className="h-3 w-3" />All votes cast
            </Badge>
          ) : (
            <Badge variant="default">Voting Open</Badge>
          )}
        </div>
        {election.description && (
          <p className="text-xs text-muted-foreground">{election.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {positions.filter(p => p.is_active).map(position => {
          const posCandidates = candidates.filter(c => c.position_id === position.id);
          const myVote = myVotes.find(v => v.position_id === position.id);

          return (
            <div key={position.id} className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {position.position_name}
                {myVote && <CheckCircle className="h-3 w-3 text-green-600" />}
              </h4>
              <div className="grid gap-1.5">
                {posCandidates.map(candidate => {
                  const isSelected = myVote?.candidate_id === candidate.id;
                  return (
                    <Button
                      key={candidate.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`justify-start h-9 ${isSelected ? '' : 'hover:border-primary/50'}`}
                      onClick={() => handleVote(position.id, candidate.id)}
                      disabled={castVote.isPending}
                    >
                      {isSelected && <CheckCircle className="h-3.5 w-3.5 mr-2" />}
                      {candidate.candidate_name}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ElectionVotingCards() {
  const queryClient = useQueryClient();
  const { data: elections = [] } = useElections();
  const openElections = elections.filter(e => e.status === 'open');

  // Realtime: refresh when elections, positions, or candidates change
  useEffect(() => {
    const channel = supabase
      .channel('home-election-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elections' }, () => {
        queryClient.invalidateQueries({ queryKey: ['elections'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_positions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['election-positions'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_candidates' }, () => {
        queryClient.invalidateQueries({ queryKey: ['election-candidates'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (openElections.length === 0) return null;

  return (
    <div className="space-y-4">
      {openElections.map(election => (
        <VotingSection key={election.id} election={election} />
      ))}
    </div>
  );
}
