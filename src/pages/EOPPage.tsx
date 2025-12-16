import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vote, Users, CheckCircle } from 'lucide-react';
import { EOPCandidateForm } from '@/components/eop/EOPCandidateForm';
import { EOPCandidateCard } from '@/components/eop/EOPCandidateCard';
import { useEOPCandidates, useMyVotes, useVoteCounts } from '@/hooks/useEOP';
import { useAuth } from '@/contexts/AuthContext';

export default function EOPPage() {
  const { isAdminOrOfficer, profile } = useAuth();
  const { data: candidates, isLoading } = useEOPCandidates();
  const { data: myVotes } = useMyVotes();
  const { data: voteCounts } = useVoteCounts();

  // Separate candidates by voting status
  const openVoting = candidates?.filter(c => c.voting_open) || [];
  const closedVoting = candidates?.filter(c => !c.voting_open) || [];

  // Get user's vote for a candidate
  const getMyVote = (candidateId: string) => {
    return myVotes?.find(v => v.candidate_id === candidateId)?.vote;
  };

  // Stats
  const totalCandidates = candidates?.length || 0;
  const votedCount = myVotes?.length || 0;
  const openCount = openVoting.length;

  return (
    <AppLayout>
      <PageHeader 
        title="EOP Voting" 
        description="Election of Pledges"
      >
        {isAdminOrOfficer && <EOPCandidateForm />}
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCandidates}</p>
              <p className="text-sm text-muted-foreground">Candidates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Vote className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-sm text-muted-foreground">Open Voting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{votedCount}</p>
              <p className="text-sm text-muted-foreground">Your Votes Cast</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : candidates && candidates.length > 0 ? (
        <Tabs defaultValue="open" className="space-y-4">
          <TabsList>
            <TabsTrigger value="open">
              Open Voting ({openCount})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Candidates ({totalCandidates})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {openVoting.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {openVoting.map((candidate) => (
                  <EOPCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    myVote={getMyVote(candidate.id)}
                    voteCounts={isAdminOrOfficer ? voteCounts?.[candidate.id] : undefined}
                    isOfficer={isAdminOrOfficer}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Vote}
                title="No active voting"
                description={isAdminOrOfficer 
                  ? "Open voting for a candidate to allow members to vote."
                  : "Check back later when officers open voting for candidates."
                }
              />
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate) => (
                <EOPCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  myVote={getMyVote(candidate.id)}
                  voteCounts={isAdminOrOfficer ? voteCounts?.[candidate.id] : undefined}
                  isOfficer={isAdminOrOfficer}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState
          icon={Vote}
          title="No candidates yet"
          description={isAdminOrOfficer 
            ? "Add PNM candidates to start the EOP process."
            : "Candidates will appear here when officers add them."
          }
        />
      )}
    </AppLayout>
  );
}
