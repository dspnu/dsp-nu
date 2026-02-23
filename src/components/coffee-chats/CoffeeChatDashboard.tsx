import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, CalendarCheck, CheckCircle2, Users, Plus, Trash2, Target, Clock, TrendingUp } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useMembers } from '@/hooks/useMembers';
import { useCoffeeChatMilestones, useCreateMilestone, useDeleteMilestone } from '@/hooks/useCoffeeChatMilestones';

const REQUIRED_CHATS = 50;

type MilestoneStatus = 'on_track' | 'warning' | 'behind';

function getMilestoneStatus(completed: number, target: number, deadline: string): MilestoneStatus {
  if (completed >= target) return 'on_track';
  const daysLeft = differenceInDays(new Date(deadline), new Date());
  if (daysLeft < 0) return 'behind';
  const remaining = target - completed;
  const pace = remaining / Math.max(daysLeft, 1);
  if (pace > 2) return 'behind';
  if (pace > 1) return 'warning';
  return 'on_track';
}

const statusColors: Record<MilestoneStatus, string> = {
  on_track: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  behind: 'text-red-600 bg-red-500/10 border-red-500/20',
};

const statusLabels: Record<MilestoneStatus, string> = {
  on_track: 'On Track',
  warning: 'At Risk',
  behind: 'Behind',
};

const statusDotColors: Record<MilestoneStatus, string> = {
  on_track: 'bg-emerald-500',
  warning: 'bg-amber-500',
  behind: 'bg-red-500',
};

export function CoffeeChatDashboard() {
  const { data: allChats, isLoading } = useCoffeeChats();
  const { data: members } = useMembers();
  const { data: milestones } = useCoffeeChatMilestones();
  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const newMembers = useMemo(() => {
    return members?.filter(m => m.status === 'new_member') || [];
  }, [members]);

  const activeMembers = useMemo(() => {
    return members?.filter(m => m.status === 'active') || [];
  }, [members]);

  const memberStats = useMemo(() => {
    if (!allChats || !newMembers.length) return [];

    return newMembers.map(member => {
      const memberChats = allChats.filter(
        c => c.initiator_id === member.user_id || c.partner_id === member.user_id
      );

      const emailed = memberChats.filter(c => c.status === 'emailed').length;
      const scheduled = memberChats.filter(c => c.status === 'scheduled').length;
      const completed = memberChats.filter(c => c.status === 'completed').length;
      const total = memberChats.length;
      const progress = Math.round((completed / REQUIRED_CHATS) * 100);

      // Calculate milestone status using next upcoming milestone
      let overallStatus: MilestoneStatus = 'on_track';
      if (milestones && milestones.length > 0) {
        for (const m of milestones) {
          const s = getMilestoneStatus(completed, m.target_count, m.deadline);
          if (s === 'behind') { overallStatus = 'behind'; break; }
          if (s === 'warning') overallStatus = 'warning';
        }
      }

      return {
        id: member.id,
        userId: member.user_id,
        name: `${member.first_name} ${member.last_name}`,
        pledgeClass: member.pledge_class,
        emailed,
        scheduled,
        completed,
        total,
        progress: Math.min(progress, 100),
        status: overallStatus,
      };
    }).sort((a, b) => b.completed - a.completed);
  }, [allChats, newMembers, milestones]);

  // Active member engagement stats
  const activeMemberEngagement = useMemo(() => {
    if (!allChats || !activeMembers.length) return [];

    return activeMembers.map(member => {
      const asPartner = allChats.filter(c => c.partner_id === member.user_id);
      const emailsReceived = asPartner.filter(c => c.status === 'emailed' || c.status === 'scheduled' || c.status === 'completed').length;
      const chatsScheduled = asPartner.filter(c => c.status === 'scheduled' || c.status === 'completed').length;
      const chatsCompleted = asPartner.filter(c => c.status === 'completed').length;
      const responseRate = emailsReceived > 0 ? Math.round((chatsScheduled / emailsReceived) * 100) : 0;

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        pledgeClass: member.pledge_class,
        emailsReceived,
        chatsScheduled,
        chatsCompleted,
        responseRate,
      };
    }).sort((a, b) => b.responseRate - a.responseRate);
  }, [allChats, activeMembers]);

  const handleCreateMilestone = () => {
    if (!newTarget || !newDeadline) return;
    createMilestone.mutate(
      { target_count: parseInt(newTarget), deadline: newDeadline },
      { onSuccess: () => { setNewTarget(''); setNewDeadline(''); setMilestoneOpen(false); } }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading dashboard...</div>;
  }

  const totalCompleted = memberStats.reduce((sum, m) => sum + m.completed, 0);
  const totalScheduled = memberStats.reduce((sum, m) => sum + m.scheduled, 0);
  const totalEmailed = memberStats.reduce((sum, m) => sum + m.emailed, 0);
  const behindCount = memberStats.filter(m => m.status === 'behind').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newMembers.length}</p>
              <p className="text-xs text-muted-foreground">New Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmailed}</p>
              <p className="text-xs text-muted-foreground">Emailed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalScheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList>
          <TabsTrigger value="progress">New Member Progress</TabsTrigger>
          <TabsTrigger value="engagement">Active Member Engagement</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        {/* New Member Progress Tab */}
        <TabsContent value="progress">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">New Member Progress</CardTitle>
              {behindCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {behindCount} behind schedule
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {memberStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No new members found</p>
              ) : (
                <div className="space-y-4">
                  {memberStats.map(member => (
                    <div key={member.id} className="space-y-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${statusDotColors[member.status]}`} />
                          <div>
                            <p className="font-medium text-sm">{member.name}</p>
                            {member.pledgeClass && (
                              <p className="text-xs text-muted-foreground">{member.pledgeClass}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 border ${statusColors[member.status]}`}>
                            {statusLabels[member.status]}
                          </Badge>
                          <Badge variant="outline" className="text-blue-600 border-blue-200 text-[10px] px-1.5">
                            <Mail className="h-3 w-3 mr-0.5" />{member.emailed}
                          </Badge>
                          <Badge variant="outline" className="text-amber-600 border-amber-200 text-[10px] px-1.5">
                            <CalendarCheck className="h-3 w-3 mr-0.5" />{member.scheduled}
                          </Badge>
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px] px-1.5">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />{member.completed}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={member.progress} className="flex-1 h-2" />
                        <span className="text-xs font-medium text-muted-foreground w-16 text-right">
                          {member.completed}/{REQUIRED_CHATS}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Member Engagement Tab */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Active Member Response Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeMemberEngagement.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active members found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-center">Emails Received</TableHead>
                        <TableHead className="text-center">Scheduled</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-center">Response Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeMemberEngagement.map(member => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              {member.pledgeClass && (
                                <p className="text-xs text-muted-foreground">{member.pledgeClass}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              {member.emailsReceived}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-amber-600 border-amber-200">
                              {member.chatsScheduled}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                              {member.chatsCompleted}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    member.responseRate >= 75 ? 'bg-emerald-500' :
                                    member.responseRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${member.responseRate}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${
                                member.responseRate >= 75 ? 'text-emerald-600' :
                                member.responseRate >= 50 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {member.responseRate}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Coffee Chat Milestones
              </CardTitle>
              <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Set Milestone</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Target Chats</label>
                      <Input
                        type="number"
                        placeholder="e.g. 20"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Deadline</label>
                      <Input
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setMilestoneOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateMilestone} disabled={createMilestone.isPending}>
                        {createMilestone.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!milestones || milestones.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No milestones set yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create milestones to track new member deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map(milestone => {
                    const daysLeft = differenceInDays(new Date(milestone.deadline), new Date());
                    const isOverdue = daysLeft < 0;

                    return (
                      <div key={milestone.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'
                          }`}>
                            {milestone.target_count}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {milestone.target_count} chats by {format(new Date(milestone.deadline), 'MMM d, yyyy')}
                            </p>
                            <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {isOverdue
                                ? `${Math.abs(daysLeft)} days overdue`
                                : `${daysLeft} days remaining`
                              }
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMilestone.mutate(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
