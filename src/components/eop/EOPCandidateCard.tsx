import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThumbsUp, ThumbsDown, Minus, Trash2 } from 'lucide-react';
import { useCastVote, useToggleVoting, useDeleteCandidate } from '@/hooks/useEOP';
import { EditCandidateButton } from './EOPCandidateForm';
import type { Tables, Enums } from '@/integrations/supabase/types';
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

type EOPCandidate = Tables<'eop_candidates'>;
type VoteType = Enums<'eop_vote'>;

interface EOPCandidateCardProps {
  candidate: EOPCandidate;
  myVote?: VoteType;
  voteCounts?: { yes: number; no: number; abstain: number; total: number };
  isOfficer?: boolean;
}

export function EOPCandidateCard({ candidate, myVote, voteCounts, isOfficer }: EOPCandidateCardProps) {
  const castVote = useCastVote();
  const toggleVoting = useToggleVoting();
  const deleteCandidate = useDeleteCandidate();

  const handleVote = (vote: VoteType) => {
    castVote.mutate({ candidate_id: candidate.id, vote });
  };

  const voteButtons = [
    { vote: 'yes' as VoteType, icon: ThumbsUp, label: 'Yes', color: 'text-emerald-600' },
    { vote: 'no' as VoteType, icon: ThumbsDown, label: 'No', color: 'text-red-600' },
    { vote: 'abstain' as VoteType, icon: Minus, label: 'Abstain', color: 'text-amber-600' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {candidate.first_name} {candidate.last_name}
            </CardTitle>
            {candidate.email && (
              <p className="text-sm text-muted-foreground mt-1">{candidate.email}</p>
            )}
          </div>
          <Badge variant={candidate.voting_open ? 'default' : 'secondary'}>
            {candidate.voting_open ? 'Voting Open' : 'Voting Closed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidate.notes && (
          <p className="text-sm text-muted-foreground">{candidate.notes}</p>
        )}

        {/* Voting Section */}
        {candidate.voting_open && !myVote && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Cast your vote:</p>
            <div className="flex gap-2">
              {voteButtons.map(({ vote, icon: Icon, label, color }) => (
                <Button
                  key={vote}
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(vote)}
                  disabled={castVote.isPending}
                  className="flex-1"
                >
                  <Icon className={`h-4 w-4 mr-1 ${color}`} />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {myVote && (
          <div className="text-sm">
            <span className="text-muted-foreground">Your vote: </span>
            <Badge variant="outline" className="capitalize">{myVote}</Badge>
          </div>
        )}

        {/* Officer Controls */}
        {isOfficer && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={`voting-${candidate.id}`}>Voting Open</Label>
              <Switch
                id={`voting-${candidate.id}`}
                checked={candidate.voting_open}
                onCheckedChange={(checked) =>
                  toggleVoting.mutate({ id: candidate.id, voting_open: checked })
                }
              />
            </div>

            {voteCounts && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                  <p className="text-lg font-bold text-emerald-600">{voteCounts.yes}</p>
                  <p className="text-xs text-muted-foreground">Yes</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                  <p className="text-lg font-bold text-red-600">{voteCounts.no}</p>
                  <p className="text-xs text-muted-foreground">No</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                  <p className="text-lg font-bold text-amber-600">{voteCounts.abstain}</p>
                  <p className="text-xs text-muted-foreground">Abstain</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <EditCandidateButton candidate={candidate} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {candidate.first_name} {candidate.last_name} and all their votes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCandidate.mutate(candidate.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
