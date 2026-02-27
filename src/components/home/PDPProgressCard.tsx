import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePDPAssignments, useMySubmissions } from '@/hooks/usePDPAssignments';

export function PDPProgressCard() {
  const { profile } = useAuth();
  const { data: assignments } = usePDPAssignments();
  const { data: mySubmissions } = useMySubmissions();

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.some(p =>
    ['VP of Pledge Education', 'VP of New Member Development', 'VP of New Member Education'].includes(p)
  );
  if (!isNewMember && !isVP) return null;

  const total = assignments?.length || 0;
  const completed = mySubmissions?.filter(s => s.status === 'complete').length || 0;
  const submitted = mySubmissions?.filter(s => s.status === 'submitted').length || 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Find next upcoming unsubmitted assignment
  const submittedIds = new Set(mySubmissions?.map(s => s.assignment_id) || []);
  const upcoming = assignments
    ?.filter(a => !submittedIds.has(a.id))
    ?.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    ?.[0];

  return (
    <Link to="/pdp">
      <Card className="border-border/60 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.98]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">PDP Progress</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {completed}/{total}
            </Badge>
          </div>

          <Progress value={progressPct} className="h-2 mb-3" />

          <div className="grid grid-cols-3 gap-2 mb-3">
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
        </CardContent>
      </Card>
    </Link>
  );
}
