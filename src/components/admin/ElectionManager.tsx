import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Vote, Plus, Trash2, Play, Square, BarChart3,
  Users, UserPlus, Trophy, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import {
  useElections, useElectionPositions, useElectionCandidates, useElectionVotes,
  useCreateElection, useUpdateElectionStatus, useDeleteElection,
  useAddElectionPosition, useDeleteElectionPosition,
  useAddElectionCandidate, useDeleteElectionCandidate,
  useTogglePositionActive,
  Election,
} from '@/hooks/useElections';

function ResultsView({ election }: { election: Election }) {
  const { data: positions = [] } = useElectionPositions(election.id);
  const { data: members = [] } = useMembers();
  const positionIds = useMemo(() => positions.map(p => p.id), [positions]);
  const { data: candidates = [] } = useElectionCandidates(positionIds);
  const { data: allVotes = [] } = useElectionVotes(positionIds);

  const totalVoters = useMemo(() => new Set(allVotes.map(v => v.voter_id)).size, [allVotes]);
  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member').length;
  const turnout = activeMembers > 0 ? Math.round((totalVoters / activeMembers) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{totalVoters}</span>
          <span className="text-muted-foreground">/ {activeMembers} voted</span>
        </div>
        <div className="flex-1">
          <Progress value={turnout} className="h-2" />
        </div>
        <span className="font-semibold text-primary">{turnout}%</span>
      </div>

      {positions.map(position => {
        const posCandidates = candidates.filter(c => c.position_id === position.id);
        const posVotes = allVotes.filter(v => v.position_id === position.id);
        const totalPosVotes = posVotes.length;

        const ranked = posCandidates
          .map(c => ({ ...c, voteCount: posVotes.filter(v => v.candidate_id === c.id).length }))
          .sort((a, b) => b.voteCount - a.voteCount);

        return (
          <div key={position.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {position.position_name}
              </h4>
              <Badge variant="outline" className="text-xs">
                {totalPosVotes} vote{totalPosVotes !== 1 ? 's' : ''}
              </Badge>
            </div>
            {ranked.length === 0 ? (
              <p className="text-xs text-muted-foreground">No candidates</p>
            ) : (
              <div className="space-y-2">
                {ranked.map((c, i) => {
                  const pct = totalPosVotes > 0 ? (c.voteCount / totalPosVotes) * 100 : 0;
                  const isWinner = election.status === 'closed' && i === 0 && c.voteCount > 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`flex items-center gap-1.5 ${isWinner ? 'font-semibold' : ''}`}>
                          {isWinner && <Trophy className="h-3 w-3 text-yellow-500" />}
                          {c.candidate_name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {c.voteCount} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ElectionDetail({ election }: { election: Election }) {
  const { user } = useAuth();
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
  const toggleActive = useTogglePositionActive();

  const [newPosition, setNewPosition] = useState('');
  const [candidateInputs, setCandidateInputs] = useState<Record<string, string>>({});

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
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
                <Play className="h-3 w-3" />Open All
              </Button>
            )}
            {election.status === 'open' && (
              <Button size="sm" variant="destructive" className="gap-1 h-7" onClick={() => updateStatus.mutate({ id: election.id, status: 'closed' })}>
                <Square className="h-3 w-3" />Close All
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
      <CardContent>
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="manage" className="text-xs gap-1.5">
              <Vote className="h-3.5 w-3.5" />Manage
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-3 mt-3">
            {/* Positions */}
            {positions.map(position => {
              const posCandidates = candidates.filter(c => c.position_id === position.id);
              return (
                <div key={position.id} className={`border rounded-lg p-3 space-y-2 ${!position.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 min-w-0">
                      <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{position.position_name}</span>
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {election.status === 'open' && (
                        <div className="flex items-center gap-1.5">
                          {position.is_active ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                          <Switch
                            checked={position.is_active}
                            onCheckedChange={(checked) => toggleActive.mutate({ id: position.id, is_active: checked })}
                            className="scale-75"
                          />
                        </div>
                      )}
                      {election.status === 'draft' && (
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => deletePosition.mutate({ id: position.id, electionId: election.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {posCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No candidates added yet</p>
                  ) : (
                    <div className="space-y-1">
                      {posCandidates.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span>{c.candidate_name}</span>
                          {election.status === 'draft' && (
                            <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteCandidate.mutate(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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
          </TabsContent>

          <TabsContent value="results" className="mt-3">
            <ResultsView election={election} />
          </TabsContent>
        </Tabs>
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
