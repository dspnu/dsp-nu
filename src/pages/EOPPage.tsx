import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vote, Users, UserCheck, Settings } from 'lucide-react';
import { useRealtimeCandidates, useRealtimeVoteCounts, useRealtimeReadyCounts, useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { EOPVotingCard } from '@/components/eop/EOPVotingCard';
import { EOPCandidateForm } from '@/components/eop/EOPCandidateForm';
import { useAuth } from '@/contexts/AuthContext';

export default function EOPPage() {
  const { isAdminOrOfficer } = useAuth();
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

      <Tabs defaultValue="voting" className="space-y-6">
        <TabsList>
          <TabsTrigger value="voting" className="gap-2">
            <Vote className="h-4 w-4" />
            Voting
          </TabsTrigger>
          {isAdminOrOfficer && (
            <TabsTrigger value="admin" className="gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* Voting Tab */}
        <TabsContent value="voting" className="space-y-6">
          {/* Quick Stats for VP */}
          {isVPChapterOps && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCandidates}</p>
                    <p className="text-xs text-muted-foreground">Total PNMs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{votedCount}</p>
                    <p className="text-xs text-muted-foreground">Voted On</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hidden md:block">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Vote className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCandidates - votedCount}</p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Candidate Cards */}
          {candidates && candidates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Show active candidate first */}
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
              {/* Then show other candidates */}
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
              description={isAdminOrOfficer 
                ? "Add PNMs in the Admin tab to begin the election process."
                : "No PNMs have been added for this election yet."
              }
            />
          )}
        </TabsContent>

        {/* Admin Tab */}
        {isAdminOrOfficer && (
          <TabsContent value="admin" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Manage PNMs</h2>
                <p className="text-sm text-muted-foreground">Add, edit, or remove PNM candidates</p>
              </div>
              <EOPCandidateForm />
            </div>

            {candidates && candidates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {candidates.map((candidate) => (
                  <Card key={candidate.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{candidate.first_name} {candidate.last_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {candidate.video_score != null && (
                              <span>Video: {candidate.video_score}</span>
                            )}
                            {candidate.interview_score != null && (
                              <span>Interview: {candidate.interview_score}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={candidate.voting_open ? 'default' : 'secondary'}>
                          {candidate.voting_open ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                      {/* Vote Results */}
                      {voteCounts?.[candidate.id] && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="font-semibold text-emerald-600">{voteCounts[candidate.id].yes}</p>
                            <p className="text-xs text-muted-foreground">Yes</p>
                          </div>
                          <div>
                            <p className="font-semibold text-red-600">{voteCounts[candidate.id].no}</p>
                            <p className="text-xs text-muted-foreground">No</p>
                          </div>
                          <div>
                            <p className="font-semibold text-muted-foreground">{voteCounts[candidate.id].total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No PNMs"
                description="Add your first PNM candidate to get started."
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
