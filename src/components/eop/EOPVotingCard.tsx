import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, ThumbsDown, Hand, CheckCircle2, Lock, Unlock, Users, RotateCcw, RefreshCw, CheckCircle, XCircle, AlertTriangle, Edit2, Check, X, UserMinus, Plus } from 'lucide-react';
import { useMyVoteForCandidate, useCastVoteRealtime, useToggleReady, useToggleVotingRealtime, useClearVotes, useChangeVote } from '@/hooks/useEOPRealtime';
import { useUpdateCandidate } from '@/hooks/useEOP';
import { useAuth } from '@/contexts/AuthContext';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import type { Tables } from '@/integrations/supabase/types';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type EOPCandidate = Tables<'eop_candidates'>;

interface EOPVotingCardProps {
  candidate: EOPCandidate;
  voteCounts?: { yes: number; no: number; abstain: number; total: number };
  readyCount?: { count: number; userIds: string[] };
  isVPChapterOps: boolean;
  isActive: boolean;
}

export function EOPVotingCard({ 
  candidate, 
  voteCounts, 
  readyCount, 
  isVPChapterOps,
  isActive 
}: EOPVotingCardProps) {
  const { user } = useAuth();
  const { data: myVote, isLoading: voteLoading } = useMyVoteForCandidate(candidate.id);
  const castVote = useCastVoteRealtime();
  const changeVote = useChangeVote();
  const toggleReady = useToggleReady();
  const toggleVoting = useToggleVotingRealtime();
  const clearVotes = useClearVotes();
  const updateCandidate = useUpdateCandidate();
  const { data: baseVoters } = useChapterSetting('eop_base_voters');

  const [isChangingVote, setIsChangingVote] = useState(false);
  const [absentName, setAbsentName] = useState('');
  const [absentPopoverOpen, setAbsentPopoverOpen] = useState(false);

  const isReady = readyCount?.userIds.includes(user?.id || '') || false;
  
  // Calculate base number: base - absent members
  const baseNumber = typeof baseVoters === 'number' ? baseVoters : (typeof baseVoters === 'string' ? parseInt(baseVoters as string) : 0);
  const absentMembers: string[] = (candidate as any).absent_members || [];
  const eligibleVoters = Math.max(0, baseNumber - absentMembers.length);
  
  const yesVotes = voteCounts?.yes || 0;
  const noVotes = voteCounts?.no || 0;
  const totalVotes = voteCounts?.total || 0;
  const requiredYes = eligibleVoters > 0 ? Math.ceil(eligibleVoters * 0.8) : 0;
  const yesPercentage = eligibleVoters > 0 ? Math.round((yesVotes / eligibleVoters) * 100) : 0;
  const isApproved = eligibleVoters > 0 && yesVotes >= requiredYes;
  const needsMoreYes = requiredYes - yesVotes;

  const handleAddAbsent = () => {
    const name = absentName.trim();
    if (!name) return;
    const updated = [...absentMembers, name];
    updateCandidate.mutate({ 
      id: candidate.id, 
      absent_members: updated,
      eligible_voters: Math.max(0, baseNumber - updated.length),
    });
    setAbsentName('');
  };

  const handleRemoveAbsent = (index: number) => {
    const updated = absentMembers.filter((_, i) => i !== index);
    updateCandidate.mutate({ 
      id: candidate.id, 
      absent_members: updated,
      eligible_voters: Math.max(0, baseNumber - updated.length),
    });
  };

  const hasVoted = !!myVote;

  const handleVote = (vote: 'yes' | 'no') => {
    castVote.mutate({ candidateId: candidate.id, vote });
  };

  const handleChangeVote = (vote: 'yes' | 'no') => {
    changeVote.mutate({ candidateId: candidate.id, vote }, {
      onSuccess: () => setIsChangingVote(false),
    });
  };

  const handleToggleReady = () => {
    toggleReady.mutate({ candidateId: candidate.id, isReady });
  };

  const handleToggleVoting = () => {
    toggleVoting.mutate({ id: candidate.id, votingOpen: !candidate.voting_open });
  };

  return (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-primary shadow-lg' : 'opacity-60'}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={candidate.picture_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {candidate.first_name?.[0]}{candidate.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">
                {candidate.first_name} {candidate.last_name}
              </h3>
              <Badge 
                variant={candidate.voting_open ? 'default' : 'secondary'}
                className={candidate.voting_open ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {candidate.voting_open ? (
                  <>
                    <Unlock className="h-3 w-3 mr-1" />
                    Open
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Closed
                  </>
                )}
              </Badge>
            </div>
            
            {/* Ready Count */}
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{readyCount?.count || 0} member{(readyCount?.count || 0) !== 1 ? 's' : ''} ready</span>
            </div>
          </div>
        </div>

        {/* Member Voting UI */}
        {candidate.voting_open && !isVPChapterOps && (
          <div className="space-y-4">
            {!hasVoted && !voteLoading ? (
              <>
                {/* Ready Button */}
                <Button
                  variant={isReady ? 'default' : 'outline'}
                  className="w-full"
                  onClick={handleToggleReady}
                  disabled={toggleReady.isPending}
                >
                  <Hand className="h-4 w-4 mr-2" />
                  {isReady ? 'Ready to Vote' : 'Mark as Ready'}
                </Button>

                {/* Vote Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-14 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                    onClick={() => handleVote('yes')}
                    disabled={castVote.isPending}
                  >
                    <ThumbsUp className="h-5 w-5 mr-2 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Yes</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/30"
                    onClick={() => handleVote('no')}
                    disabled={castVote.isPending}
                  >
                    <ThumbsDown className="h-5 w-5 mr-2 text-red-600" />
                    <span className="text-red-600 font-medium">No</span>
                  </Button>
                </div>
              </>
            ) : hasVoted ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-3 bg-muted/50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium">
                    You voted: <span className={myVote.vote === 'yes' ? 'text-emerald-600' : 'text-red-600'}>{myVote.vote === 'yes' ? 'Yes' : 'No'}</span>
                  </span>
                </div>
                
                {/* Change Vote UI */}
                {isChangingVote ? (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">Select your new vote:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-12 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                        onClick={() => handleChangeVote('yes')}
                        disabled={changeVote.isPending}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Yes</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/30"
                        onClick={() => handleChangeVote('no')}
                        disabled={changeVote.isPending}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-red-600 font-medium">No</span>
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setIsChangingVote(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Change Vote
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Change your vote?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You currently voted <strong className={myVote.vote === 'yes' ? 'text-emerald-600' : 'text-red-600'}>{myVote.vote === 'yes' ? 'Yes' : 'No'}</strong> for {candidate.first_name} {candidate.last_name}. 
                          Are you sure you want to change your vote?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setIsChangingVote(true)}>
                          Change Vote
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Voting Closed Message for Members */}
        {!candidate.voting_open && !isVPChapterOps && (
          <div className="text-center py-4 text-muted-foreground">
            <Lock className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Voting is closed for this PNM</p>
          </div>
        )}

        {/* VP of Chapter Operations Controls */}
        {isVPChapterOps && (
          <div className="space-y-4 pt-4 border-t">
            {/* Base Number Display (auto-calculated) */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
              <span className="text-sm text-muted-foreground">Base Number</span>
              <div className="text-right">
                <span className="font-semibold text-lg">{eligibleVoters}</span>
                {absentMembers.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({baseNumber} - {absentMembers.length} out)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Absent Member Tracker */}
            <Popover open={absentPopoverOpen} onOpenChange={setAbsentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 relative"
                >
                  <UserMinus className="h-4 w-4" />
                  Out of Room
                  {absentMembers.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                      {absentMembers.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Members out of the room</p>
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleAddAbsent(); }}
                    className="flex gap-1.5"
                  >
                    <Input
                      value={absentName}
                      onChange={(e) => setAbsentName(e.target.value)}
                      placeholder="Name..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="h-8 px-2 shrink-0"
                      disabled={!absentName.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                  {absentMembers.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {absentMembers.map((name, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-muted/50 text-sm">
                          <span className="truncate">{name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveAbsent(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No one marked as absent</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Vote Counts with Percentage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{yesVotes}</p>
                <p className="text-xs text-muted-foreground font-medium">Yes Votes</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{noVotes}</p>
                <p className="text-xs text-muted-foreground font-medium">No Votes</p>
              </div>
            </div>

            {/* Approval Status with Percentage */}
            {eligibleVoters > 0 && (
              <div className={`p-3 rounded-lg flex items-center justify-between ${
                isApproved 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {isApproved ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className={`font-semibold text-sm ${isApproved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {isApproved ? 'Approved for Bid' : needsMoreYes > 0 ? `Need ${needsMoreYes} more Yes` : 'Pending'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalVotes}/{eligibleVoters} voted • {requiredYes} required (80%)
                    </p>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${isApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {yesPercentage}%
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                variant={candidate.voting_open ? 'destructive' : 'default'}
                className="flex-1"
                onClick={handleToggleVoting}
                disabled={toggleVoting.isPending}
              >
                {candidate.voting_open ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Close Voting
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Open Voting
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Votes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all votes for {candidate.first_name} {candidate.last_name}. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => clearVotes.mutate(candidate.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset Votes
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
