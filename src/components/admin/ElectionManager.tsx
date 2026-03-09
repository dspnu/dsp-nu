import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Vote, Plus, Trash2, Play, Square, ChevronDown, BarChart3,
  Users, UserPlus, Trophy, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import {
  useElections, useElectionPositions, useElectionCandidates, useElectionVotes,
  useCreateElection, useUpdateElectionStatus, useDeleteElection,
  useAddElectionPosition, useDeleteElectionPosition,
  useAddElectionCandidate, useDeleteElectionCandidate,
  Election,
} from '@/hooks/useElections';

function ElectionDetail({ election }: { election: Election }) {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: positions = [] } = useElectionPositions(election.id);
  const positionIds = useMemo(() => positions.map(p => p.id), [positions]);
  const { data: candidates = [] } = useElectionCandidates(positionIds);
  const { data: allVotes = [] } = useElectionVotes(positionIds);
  const updateStatus = useUpdateElectionStatus();
  const deleteElection = useDeleteElection();
  const addPosition = useAddElectionPosition();
  const deletePosition = useDeleteElectionPosition();
  const addCandidate = useAddElectionCandidate();
  const deleteCandidate = useDeleteElectionCandidate();

  const [newPosition, setNewPosition] = useState('');
  const [candidateInputs, setCandidateInputs] = useState<Record<string, string>>({});

  const totalVoters = useMemo(() => {
    const voterIds = new Set(allVotes.map(v => v.voter_id));
    return voterIds.size;
  }, [allVotes]);

  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member').length;

  const handleAddPosition = () => {
    if (!newPosition.trim()) return;
    addPosition.mutate({
      election_id: election.id,
      position_name: newPosition.trim(),
      sort_order: positions.length,
    });
    setNewPosition('');
  };

  const handleAddCandidate = (positionId: string) => {
    const name = candidateInputs[positionId]?.trim();
    if (!name) return;
    addCandidate.mutate({ position_id: positionId, candidate_name: name });
    setCandidateInputs(prev => ({ ...prev, [positionId]: '' }));
  };

  const statusColor = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-emerald-500/20 text-emerald-700',
    closed: 'bg-red-500/20 text-red-700',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{election.title}</CardTitle>
            {election.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{election.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={statusColor[election.status]}>{election.status}</Badge>
            {election.status === 'draft' && (
              <Button size="sm" variant="default" className="gap-1 h-7" onClick={() => updateStatus.mutate({ id: election.id, status: 'open' })}>
                <Play className="h-3 w-3" />Open
              </Button>
            )}
            {election.status === 'open' && (
              <Button size="sm" variant="destructive" className="gap-1 h-7" onClick={() => updateStatus.mutate({ id: election.id, status: 'closed' })}>
                <Square className="h-3 w-3" />Close
              </Button>
            )}
            {election.status === 'closed' && (
              <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => updateStatus.mutate({ id: election.id, status: 'draft' })}>
                Reset to Draft
              </Button>
            )}
            {election.status === 'draft' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Election?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this election, all positions, candidates, and votes.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteElection.mutate(election.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats bar */}
        {(election.status === 'open' || election.status === 'closed') && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{totalVoters} voted</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{activeMembers > 0 ? Math.round((totalVoters / activeMembers) * 100) : 0}% turnout</span>
            </div>
          </div>
        )}

        {/* Positions */}
        {positions.map(position => {
          const posCandidates = candidates.filter(c => c.position_id === position.id);
          const posVotes = allVotes.filter(v => v.position_id === position.id);
          const totalPosVotes = posVotes.length;

          return (
            <div key={position.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  {position.position_name}
                </h4>
                {election.status === 'draft' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deletePosition.mutate({ id: position.id, electionId: election.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Candidates with results */}
              {posCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No candidates added yet</p>
              ) : (
                <div className="space-y-1.5">
                  {posCandidates
                    .map(c => ({
                      ...c,
                      voteCount: posVotes.filter(v => v.candidate_id === c.id).length,
                    }))
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .map((c, i) => {
                      const pct = totalPosVotes > 0 ? (c.voteCount / totalPosVotes) * 100 : 0;
                      const isWinner = election.status === 'closed' && i === 0 && c.voteCount > 0;

                      return (
                        <div key={c.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isWinner && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                              <span className={`text-sm truncate ${isWinner ? 'font-semibold' : ''}`}>
                                {c.candidate_name}
                              </span>
                            </div>
                            {(election.status === 'open' || election.status === 'closed') && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <Progress value={pct} className="h-1.5 flex-1" />
                                <span className="text-[10px] text-muted-foreground w-16 text-right">
                                  {c.voteCount} ({Math.round(pct)}%)
                                </span>
                              </div>
                            )}
                          </div>
                          {election.status === 'draft' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => deleteCandidate.mutate(c.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Add candidate (draft only) */}
              {election.status === 'draft' && (
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="Add candidate name..."
                    value={candidateInputs[position.id] || ''}
                    onChange={(e) => setCandidateInputs(prev => ({ ...prev, [position.id]: e.target.value }))}
                    className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate(position.id)}
                  />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleAddCandidate(position.id)}>
                    <UserPlus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add position (draft only) */}
        {election.status === 'draft' && (
          <div className="flex gap-2">
            <Input
              placeholder="Add position (e.g. President)..."
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPosition()}
            />
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleAddPosition}>
              <Plus className="h-3 w-3" />Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ElectionManager() {
  const { user } = useAuth();
  const { data: elections = [] } = useElections();
  const createElection = useCreateElection();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    createElection.mutate(
      { title: title.trim(), description: description.trim() || undefined, created_by: user.id },
      { onSuccess: () => { setCreateOpen(false); setTitle(''); setDescription(''); } }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Vote className="h-4 w-4 text-primary" />
            Exec Elections
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 h-8">
                <Plus className="h-3.5 w-3.5" />New Election
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Election</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spring 2026 Exec Elections" required />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any additional notes..." />
                </div>
                <Button type="submit" className="w-full" disabled={createElection.isPending}>
                  {createElection.isPending ? 'Creating...' : 'Create Election'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {elections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No elections yet. Create one to get started.
          </p>
        ) : (
          elections.map(election => (
            <ElectionDetail key={election.id} election={election} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
