import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Vote, Users, UserCheck, Settings, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useRealtimeCandidates, useRealtimeVoteCounts, useRealtimeReadyCounts, useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { useDeleteCandidate } from '@/hooks/useEOP';
import { EOPVotingCard } from '@/components/eop/EOPVotingCard';
import { EOPCandidateForm, EditCandidateButton } from '@/components/eop/EOPCandidateForm';
import { useAuth } from '@/contexts/AuthContext';

export default function EOPPage() {
  const { isAdminOrOfficer } = useAuth();
  const { isVPChapterOps } = useIsVPChapterOps();
  const { data: candidates, isLoading } = useRealtimeCandidates();
  const { data: voteCounts } = useRealtimeVoteCounts();
  const { data: readyCounts } = useRealtimeReadyCounts();
  const deleteCandidate = useDeleteCandidate();

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
                {candidates.map((candidate) => {
                  const counts = voteCounts?.[candidate.id];
                  const yesVotes = counts?.yes || 0;
                  const noVotes = counts?.no || 0;
                  const totalVotes = counts?.total || 0;
                  const eligibleVoters = (candidate as any).eligible_voters || 0;
                  
                  // 80% approval calculation
                  const requiredYes = eligibleVoters > 0 ? Math.ceil(eligibleVoters * 0.8) : 0;
                  const isApproved = eligibleVoters > 0 && yesVotes >= requiredYes;
                  const isRejected = eligibleVoters > 0 && totalVotes >= eligibleVoters && yesVotes < requiredYes;

                  return (
                    <Card key={candidate.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
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
                          <div className="flex items-center gap-1">
                            <EditCandidateButton candidate={candidate} />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete PNM?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {candidate.first_name} {candidate.last_name} and all their voting data. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCandidate.mutate(candidate.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Status & Eligible Voters */}
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <Badge variant={candidate.voting_open ? 'default' : 'secondary'}>
                            {candidate.voting_open ? 'Voting Open' : 'Closed'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Eligible: {eligibleVoters} voters
                          </span>
                        </div>

                        {/* Vote Results with Approval Status */}
                        {(counts || eligibleVoters > 0) && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            <div className="grid grid-cols-4 gap-2 text-center text-sm">
                              <div>
                                <p className="font-semibold text-emerald-600">{yesVotes}</p>
                                <p className="text-xs text-muted-foreground">Yes</p>
                              </div>
                              <div>
                                <p className="font-semibold text-red-600">{noVotes}</p>
                                <p className="text-xs text-muted-foreground">No</p>
                              </div>
                              <div>
                                <p className="font-semibold text-muted-foreground">{counts?.abstain || 0}</p>
                                <p className="text-xs text-muted-foreground">Abstain</p>
                              </div>
                              <div>
                                <p className="font-semibold">{totalVotes}/{eligibleVoters}</p>
                                <p className="text-xs text-muted-foreground">Voted</p>
                              </div>
                            </div>

                            {/* Approval Status */}
                            {eligibleVoters > 0 && (
                              <div className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                                isApproved 
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                                  : isRejected 
                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              }`}>
                                {isApproved ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Approved ({yesVotes}/{requiredYes} required)</span>
                                  </>
                                ) : isRejected ? (
                                  <>
                                    <XCircle className="h-4 w-4" />
                                    <span>Not Approved ({yesVotes}/{requiredYes} required)</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Need {requiredYes} yes votes (80%)</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
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
