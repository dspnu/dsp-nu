import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, CalendarCheck, CheckCircle2, Plus, Trash2, Target, Clock, TrendingUp, ArrowUpDown, Users, ChevronDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useCoffeeChats } from '@/features/coffee-chats/hooks/useCoffeeChats';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAuth } from '@/core/auth/AuthContext';
import { isPDPOfficer } from '@/config/org';
import { useCoffeeChatMilestones, useCreateMilestone, useDeleteMilestone } from '@/features/coffee-chats/hooks/useCoffeeChatMilestones';

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

const statusDotColors: Record<MilestoneStatus, string> = {
  on_track: 'bg-emerald-500',
  warning: 'bg-amber-500',
  behind: 'bg-red-500',
};

const statusLabels: Record<MilestoneStatus, string> = {
  on_track: 'On Track',
  warning: 'At Risk',
  behind: 'Behind',
};

const statusBadgeColors: Record<MilestoneStatus, string> = {
  on_track: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
  warning: 'text-amber-700 bg-amber-500/10 border-amber-500/30',
  behind: 'text-red-700 bg-red-500/10 border-red-500/30',
};

type SortKey = 'name' | 'emailsReceived' | 'chatsScheduled' | 'chatsCompleted' | 'responseRate';

type CoffeeChatDashboardProps = {
  /** When set, wraps the chapter response-rate table in a collapsible (e.g. Chapter → Coffee Chats). */
  collapsibleEngagement?: boolean;
};

export function CoffeeChatDashboard({ collapsibleEngagement = false }: CoffeeChatDashboardProps) {
  const { profile } = useAuth();
  const { data: allChats, isLoading } = useCoffeeChats();
  const { data: members } = useMembers();
  const { data: milestones } = useCoffeeChatMilestones();
  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [engagementSort, setEngagementSort] = useState<SortKey>('responseRate');
  const [sortAsc, setSortAsc] = useState(false);

  const isVP = isPDPOfficer(profile);

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
      const progress = Math.round((completed / REQUIRED_CHATS) * 100);

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
        progress: Math.min(progress, 100),
        status: overallStatus,
      };
    }).sort((a, b) => b.completed - a.completed);
  }, [allChats, newMembers, milestones]);

  const activeMemberEngagement = useMemo(() => {
    if (!allChats || !activeMembers.length) return [];

    const data = activeMembers.map(member => {
      const asPartner = allChats.filter(c => c.partner_id === member.user_id);
      const emailsReceived = asPartner.filter(c => c.status === 'emailed' || c.status === 'scheduled' || c.status === 'completed').length;
      const chatsScheduled = asPartner.filter(c => c.status === 'scheduled' || c.status === 'completed').length;
      const chatsCompleted = asPartner.filter(c => c.status === 'completed').length;
      const responseRate = emailsReceived > 0 ? Math.round((chatsScheduled / emailsReceived) * 100) : 0;

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        emailsReceived,
        chatsScheduled,
        chatsCompleted,
        responseRate,
      };
    });

    data.sort((a, b) => {
      const aVal = a[engagementSort];
      const bVal = b[engagementSort];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return data;
  }, [allChats, activeMembers, engagementSort, sortAsc]);

  const handleCreateMilestone = () => {
    if (!newTarget || !newDeadline) return;
    createMilestone.mutate(
      { target_count: parseInt(newTarget), deadline: newDeadline },
      { onSuccess: () => { setNewTarget(''); setNewDeadline(''); setMilestoneOpen(false); } }
    );
  };

  const toggleSort = (key: SortKey) => {
    if (engagementSort === key) {
      setSortAsc(!sortAsc);
    } else {
      setEngagementSort(key);
      setSortAsc(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/80" />
        ))}
      </div>
    );
  }

  const totalCompleted = memberStats.reduce((sum, m) => sum + m.completed, 0);
  const totalScheduled = memberStats.reduce((sum, m) => sum + m.scheduled, 0);
  const totalEmailed = memberStats.reduce((sum, m) => sum + m.emailed, 0);
  const behindCount = memberStats.filter(m => m.status === 'behind').length;

  const engagementCardContent = (
    <CardContent className="p-0">
      {activeMemberEngagement.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No engagement data yet</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Member <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button type="button" onClick={() => toggleSort('emailsReceived')} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                    Emails <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button type="button" onClick={() => toggleSort('chatsScheduled')} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                    Scheduled <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button type="button" onClick={() => toggleSort('chatsCompleted')} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                    Completed <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button type="button" onClick={() => toggleSort('responseRate')} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                    Response Rate <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMemberEngagement.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-semibold text-foreground">{member.name}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-sm">{member.emailsReceived}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-sm">{member.chatsScheduled}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-sm">{member.chatsCompleted}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            member.responseRate >= 75 ? 'bg-emerald-500' :
                            member.responseRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${member.responseRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${
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
  );

  return (
    <div className="space-y-6">
      {/* Compact Summary Bar — replaces large KPI cards */}
      {isVP && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            {newMembers.length} New Members
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {totalEmailed} emailed
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" /> {totalScheduled} scheduled
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> {totalCompleted} completed
          </span>
          {behindCount > 0 && (
            <Badge variant="destructive" className="text-xs ml-auto">
              {behindCount} behind
            </Badge>
          )}
        </div>
      )}

      {/* New Member Progress — admin only */}
      {isVP && memberStats.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            New Member Progress
          </h3>
          <div className="space-y-2">
            {memberStats.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColors[member.status]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs px-2 border ${statusBadgeColors[member.status]}`}>
                        {statusLabels[member.status]}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="flex items-center gap-0.5 text-blue-600">
                          <Mail className="h-3.5 w-3.5" /><span className="font-semibold text-sm">{member.emailed}</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-600">
                          <CalendarCheck className="h-3.5 w-3.5" /><span className="font-semibold text-sm">{member.scheduled}</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /><span className="font-semibold text-sm">{member.completed}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={member.progress} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium text-muted-foreground w-14 text-right">
                      {member.completed}/{REQUIRED_CHATS}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Milestones — admin only */}
      {isVP && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Target className="h-4 w-4" />
              Milestones
            </h3>
            <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
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
          </div>

          {!milestones || milestones.length === 0 ? (
            <div className="text-center py-6 border rounded-lg bg-card">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1.5" />
              <p className="text-sm text-muted-foreground">No milestones set</p>
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map(milestone => {
                const daysLeft = differenceInDays(new Date(milestone.deadline), new Date());
                const isOverdue = daysLeft < 0;

                return (
                  <div key={milestone.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-bold ${
                        isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'
                      }`}>
                        {milestone.target_count}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {milestone.target_count} chats by {format(new Date(milestone.deadline), 'MMM d, yyyy')}
                        </p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
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
        </section>
      )}

      {/* Active member response rates — visible to everyone */}
      <section>
        {collapsibleEngagement ? (
          <Collapsible defaultOpen className="rounded-lg border border-border bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Chapter coffee chat response rates</h3>
                  <p className="text-xs text-muted-foreground">Per active member: invites, scheduled, completed, and response rate</p>
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border">
                <Card className="rounded-none border-0 shadow-none">{engagementCardContent}</Card>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              Active Member Engagement
            </h3>
            <Card>{engagementCardContent}</Card>
          </>
        )}
      </section>
    </div>
  );
}
