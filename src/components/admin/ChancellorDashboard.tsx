import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useRealtimeCandidates, useRealtimeVoteCounts } from '@/hooks/useEOPRealtime';
import { useDeleteCandidate } from '@/hooks/useEOP';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { EOPCandidateForm, EditCandidateButton } from '@/components/eop/EOPCandidateForm';
import { EOPImportDialog } from '@/components/eop/EOPImportDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export function ChancellorDashboard() {
  const { data: candidates = [] } = useRealtimeCandidates();
  const { data: voteCounts } = useRealtimeVoteCounts();
  const deleteCandidate = useDeleteCandidate();
  const { data: baseVoters } = useChapterSetting('eop_base_voters');
  const currentBase = typeof baseVoters === 'number' ? baseVoters : (typeof baseVoters === 'string' ? parseInt(baseVoters as string) : 0);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Calculate results for each candidate
  const candidateResults = candidates.map((candidate) => {
    const counts = voteCounts?.[candidate.id];
    const yesVotes = counts?.yes || 0;
    const absentMembers: string[] = (candidate as any).absent_members || [];
    const eligibleVoters = Math.max(0, currentBase - absentMembers.length);
    const requiredYes = eligibleVoters > 0 ? Math.ceil(eligibleVoters * 0.8) : 0;
    const isApproved = eligibleVoters > 0 && yesVotes >= requiredYes;
    const totalVotes = counts?.total || 0;
    return { ...candidate, yesVotes, eligibleVoters, requiredYes, isApproved, totalVotes, noVotes: counts?.no || 0, abstainVotes: counts?.abstain || 0 };
  });

  const approvedCount = candidateResults.filter(c => c.isApproved).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">Chancellor</h3>
        <p className="text-sm text-muted-foreground">Manage PNM candidates for EOP</p>
      </div>

      {/* EOP Results */}
      {candidates.length > 0 && (
        <Collapsible open={resultsOpen} onOpenChange={setResultsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    EOP Results ({approvedCount}/{candidates.length} approved)
                  </span>
                  <Badge variant={approvedCount > 0 ? 'default' : 'secondary'}>{approvedCount}</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                {candidateResults.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${c.isApproved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center gap-2">
                      {c.isApproved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="text-sm font-medium">{c.first_name} {c.last_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.yesVotes}/{c.eligibleVoters} yes ({c.eligibleVoters > 0 ? Math.round((c.yesVotes / c.eligibleVoters) * 100) : 0}%)
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Manage PNMs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Add, edit, or remove PNM candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <EOPImportDialog />
          <EOPCandidateForm />
        </div>
      </div>

      {candidates.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {candidates.map((candidate) => {
            const counts = voteCounts?.[candidate.id];
            const yesVotes = counts?.yes || 0;
            const noVotes = counts?.no || 0;
            const totalVotes = counts?.total || 0;
            const absentMembers: string[] = (candidate as any).absent_members || [];
            const eligibleVoters = Math.max(0, currentBase - absentMembers.length);
            const requiredYes = eligibleVoters > 0 ? Math.ceil(eligibleVoters * 0.8) : 0;
            const isApproved = eligibleVoters > 0 && yesVotes >= requiredYes;

            return (
              <Card key={candidate.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{candidate.first_name} {candidate.last_name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {candidate.video_score != null && (
                          <span>Video: {candidate.video_score}{(candidate as any).video_graded_by ? ` (${(candidate as any).video_graded_by})` : ''}</span>
                        )}
                        {candidate.interview_score != null && (
                          <span>Interview: {candidate.interview_score}{(candidate as any).interview_graded_by ? ` (${(candidate as any).interview_graded_by})` : ''}</span>
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
                              This will permanently delete {candidate.first_name} {candidate.last_name} and all their voting data.
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

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <Badge variant={candidate.voting_open ? 'default' : 'secondary'}>
                      {candidate.voting_open ? 'Voting Open' : 'Closed'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Base: {eligibleVoters}
                      {absentMembers.length > 0 && (
                        <span className="text-xs"> ({absentMembers.length} out)</span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No PNMs added yet. Use the buttons above to add or import candidates.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
