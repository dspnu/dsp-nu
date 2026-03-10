import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, UserCheck } from 'lucide-react';
import { useRealtimeCandidates, useRealtimeVoteCounts, useRealtimeReadyCounts, useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { EOPVotingCard } from '@/components/eop/EOPVotingCard';

export default function EOPPage() {
  const { isVPChapterOps } = useIsVPChapterOps();
  const { data: candidates, isLoading } = useRealtimeCandidates();
  const { data: voteCounts } = useRealtimeVoteCounts();
  const { data: readyCounts } = useRealtimeReadyCounts();

  // Find the active candidate (voting open)
  const activeCandidate = useMemo(() => 
    candidates?.find(c => c.voting_open), 
    [candidates]
  );

  // Stats
  const totalCandidates = candidates?.length || 0;
  const votedCount = useMemo(() => {
    if (!voteCounts) return 0;
    return Object.keys(voteCounts).length;
  }, [voteCounts]);

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="EOP Voting" description="Election of Pledges" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="EOP Voting" 
        description="Election of Pledges - Cast your vote for PNMs"
      />

      {/* Status Banner */}
      {activeCandidate ? (
        <Card className="mb-6 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Voting is Open</p>
                <p className="text-sm text-muted-foreground">
                  Currently voting on: <span className="font-semibold text-foreground">{activeCandidate.first_name} {activeCandidate.last_name}</span>
                </p>
              </div>
              <Badge variant="default" className="bg-emerald-600">Active</Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-muted">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Vote className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">No Active Voting</p>
                <p className="text-sm text-muted-foreground">
                  {isVPChapterOps ? 'Open voting for a PNM to begin' : 'Waiting for VP to open voting'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats for VP */}
      {isVPChapterOps && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalCandidates}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total PNMs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{votedCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Voted On</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Vote className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalCandidates - votedCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Remaining</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Candidate Cards */}
      {candidates && candidates.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {activeCandidate && (
            <EOPVotingCard
              key={activeCandidate.id}
              candidate={activeCandidate}
              voteCounts={voteCounts?.[activeCandidate.id]}
              readyCount={readyCounts?.[activeCandidate.id]}
              isVPChapterOps={isVPChapterOps}
              isActive={true}
            />
          )}
          {candidates
            .filter(c => c.id !== activeCandidate?.id)
            .map((candidate) => (
              <EOPVotingCard
                key={candidate.id}
                candidate={candidate}
                voteCounts={voteCounts?.[candidate.id]}
                readyCount={readyCounts?.[candidate.id]}
                isVPChapterOps={isVPChapterOps}
                isActive={false}
              />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={Vote}
          title="No PNMs Added"
          description="No PNMs have been added for this election yet."
        />
      )}
    </AppLayout>
  );
}
