import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Coffee, Target } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePDPAssignments, useMySubmissions } from '@/hooks/usePDPAssignments';
import { useMyCoffeeChats } from '@/hooks/useCoffeeChats';
import { useCoffeeChatMilestones } from '@/hooks/useCoffeeChatMilestones';

export function PDPProgressCard() {
  const { profile } = useAuth();
  const { data: assignments } = usePDPAssignments();
  const { data: mySubmissions } = useMySubmissions();
  const { data: myChats } = useMyCoffeeChats();
  const { data: milestones } = useCoffeeChatMilestones();

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.some(p =>
    ['VP of Pledge Education', 'VP of New Member Development', 'VP of New Member Education'].includes(p)
  );
  if (!isNewMember && !isVP) return null;

  // Assignment stats
  const total = assignments?.length || 0;
  const completed = mySubmissions?.filter(s => s.status === 'complete').length || 0;
  const submitted = mySubmissions?.filter(s => s.status === 'submitted').length || 0;

  // Coffee chat stats
  const chatCompleted = myChats?.filter(c => c.status === 'completed').length || 0;
  const chatScheduled = myChats?.filter(c => c.status === 'scheduled').length || 0;
  const chatEmailed = myChats?.filter(c => c.status === 'emailed').length || 0;
  const totalRequired = 50;
  const chatPct = Math.round((chatCompleted / totalRequired) * 100);

  // Next milestone deadline
  const nextMilestone = milestones
    ?.filter(m => {
      const daysLeft = differenceInDays(new Date(m.deadline), new Date());
      return daysLeft >= 0 || chatCompleted < m.target_count;
    })
    ?.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    ?.[0];

  // Next upcoming unsubmitted assignment
  const submittedIds = new Set(mySubmissions?.map(s => s.assignment_id) || []);
  const upcoming = assignments
    ?.filter(a => !submittedIds.has(a.id))
    ?.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    ?.[0];

  return (
    <Link to="/pdp">
      <Card className="border-border/60 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.98]">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Coffee Chat Progress */}
          {isNewMember && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coffee className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Coffee Chats</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {chatCompleted}/{totalRequired}
                </Badge>
              </div>
              <Progress value={Math.min(chatPct, 100)} className="h-2 mb-2" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{chatEmailed} emailed</span>
                <span>{chatScheduled} scheduled</span>
                <span className="text-emerald-600 font-medium">{chatCompleted} completed</span>
              </div>

              {nextMilestone && (
                <div className={`mt-2 text-xs rounded-md px-2.5 py-1.5 ${
                  isPast(new Date(nextMilestone.deadline)) && chatCompleted < nextMilestone.target_count
                    ? 'bg-destructive/10 text-destructive'
                    : differenceInDays(new Date(nextMilestone.deadline), new Date()) <= 7
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  <Target className="h-3 w-3 inline mr-1" />
                  <span className="font-medium">Milestone:</span> {nextMilestone.target_count} chats by {format(new Date(nextMilestone.deadline), 'MMM d')}
                  {isPast(new Date(nextMilestone.deadline)) && chatCompleted < nextMilestone.target_count
                    ? ' — Overdue'
                    : ` — ${differenceInDays(new Date(nextMilestone.deadline), new Date())}d left`
                  }
                </div>
              )}
            </div>
          )}

          {/* Assignment Progress */}
          {total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Assignments</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {completed}/{total}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-lg font-bold">{completed}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-lg font-bold">{submitted}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-lg font-bold">{total - completed - submitted}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">To Do</p>
                </div>
              </div>

              {upcoming && (
                <div className={`text-xs rounded-md px-2.5 py-1.5 ${
                  isPast(new Date(upcoming.due_date))
                    ? 'bg-destructive/10 text-destructive'
                    : differenceInDays(new Date(upcoming.due_date), new Date()) <= 3
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="font-medium">Next:</span> {upcoming.title}
                  <span className="ml-1">
                    — {isPast(new Date(upcoming.due_date)) ? 'Overdue' : `Due ${format(new Date(upcoming.due_date), 'MMM d')}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
