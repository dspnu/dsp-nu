import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Minus, Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useMembers } from '@/hooks/useMembers';
import { usePDPAssignments, usePDPSubmissions } from '@/hooks/usePDPAssignments';
import { useCoffeeChatMilestones } from '@/hooks/useCoffeeChatMilestones';
import { useCoffeeChats } from '@/hooks/useCoffeeChats';

export function PDPProgress() {
  const { data: members } = useMembers();
  const { data: assignments } = usePDPAssignments();
  const { data: allSubmissions } = usePDPSubmissions();
  const { data: milestones } = useCoffeeChatMilestones();
  const { data: allChats } = useCoffeeChats();

  const newMembers = useMemo(() =>
    members?.filter(m => m.status === 'new_member').sort((a, b) => a.last_name.localeCompare(b.last_name)) || [],
    [members]
  );

  // For each new member, count completed coffee chats
  const chatCountByUser = useMemo(() => {
    const counts: Record<string, number> = {};
    allChats?.forEach(chat => {
      if (chat.status === 'completed') {
        counts[chat.initiator_id] = (counts[chat.initiator_id] || 0) + 1;
      }
    });
    return counts;
  }, [allChats]);

  const sortedMilestones = useMemo(() =>
    milestones?.slice().sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) || [],
    [milestones]
  );

  const sortedAssignments = useMemo(() =>
    assignments?.slice().sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) || [],
    [assignments]
  );

  // Get submission status for a user+assignment
  const getStatus = (userId: string, assignmentId: string) => {
    const sub = allSubmissions?.find(s => s.user_id === userId && s.assignment_id === assignmentId);
    const assignment = sortedAssignments.find(a => a.id === assignmentId);
    if (!assignment) return 'dash';
    if (sub) return sub.status; // 'submitted' | 'complete' | 'incomplete'
    if (isPast(new Date(assignment.due_date))) return 'missing';
    return 'dash';
  };

  // Get coffee chat milestone status for a user
  const getMilestoneStatus = (userId: string, milestone: { target_count: number; deadline: string }) => {
    const count = chatCountByUser[userId] || 0;
    if (count >= milestone.target_count) return 'complete';
    if (isPast(new Date(milestone.deadline))) return 'missing';
    return 'dash';
  };

  const totalCols = sortedAssignments.length + sortedMilestones.length;

  if (newMembers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No new members found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Progress Overview</h2>
        <p className="text-sm text-muted-foreground">{newMembers.length} new members · {sortedAssignments.length} assignments · {sortedMilestones.length} milestones</p>
      </div>

      <Card>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-card z-10 text-left p-2 font-semibold min-w-[160px] border-r">
                    Member
                  </th>
                  {sortedAssignments.map(a => (
                    <th key={a.id} className="p-2 font-medium text-center min-w-[100px] border-r">
                      <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {format(new Date(a.due_date), 'MMM d')}
                      </div>
                    </th>
                  ))}
                  {sortedMilestones.map(m => (
                    <th key={m.id} className="p-2 font-medium text-center min-w-[100px] border-r">
                      <div className="truncate max-w-[100px]">{m.target_count} Chats</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        by {format(new Date(m.deadline), 'MMM d')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newMembers.map(member => (
                  <tr key={member.id} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="sticky left-0 bg-card z-10 p-2 font-medium border-r">
                      {member.first_name} {member.last_name}
                    </td>
                    {sortedAssignments.map(a => {
                      const status = getStatus(member.user_id, a.id);
                      return (
                        <td key={a.id} className="p-2 text-center border-r">
                          <StatusIcon status={status} />
                        </td>
                      );
                    })}
                    {sortedMilestones.map(m => {
                      const status = getMilestoneStatus(member.user_id, m);
                      return (
                        <td key={m.id} className="p-2 text-center border-r">
                          <StatusIcon status={status} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Complete</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-500" /> Submitted</span>
        <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-500" /> Missing/Incomplete</span>
        <span className="flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-muted-foreground" /> Not yet due</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />;
    case 'submitted':
      return <Clock className="h-4 w-4 text-blue-500 mx-auto" />;
    case 'incomplete':
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-500 mx-auto" />;
    case 'dash':
    default:
      return <Minus className="h-4 w-4 text-muted-foreground mx-auto" />;
  }
}
