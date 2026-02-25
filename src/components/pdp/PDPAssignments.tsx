import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Plus, ClipboardList, Calendar, Trash2, CheckCircle2, XCircle, Clock, Send, MessageSquare, CalendarPlus } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import {
  usePDPAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useMySubmissions,
  usePDPSubmissions,
  useSubmitAssignment,
  useUpdateSubmissionStatus,
  usePDPComments,
  useAddComment,
  type PDPAssignment,
  type PDPSubmission,
} from '@/hooks/usePDPAssignments';

interface Props {
  isVP: boolean;
  isNewMember: boolean;
}

function generateCalendarUrl(type: 'google' | 'outlook' | 'apple', assignment: PDPAssignment) {
  const title = encodeURIComponent(`PDP: ${assignment.title}`);
  const date = new Date(assignment.due_date);
  const dateStr = format(date, "yyyyMMdd'T'HHmmss");
  const endStr = format(new Date(date.getTime() + 3600000), "yyyyMMdd'T'HHmmss");

  if (type === 'google') {
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${endStr}`;
  }
  if (type === 'outlook') {
    return `https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${date.toISOString()}&enddt=${new Date(date.getTime() + 3600000).toISOString()}`;
  }
  // Apple/ICS
  return `data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${dateStr}%0ADTEND:${endStr}%0ASUMMARY:${title}%0AEND:VEVENT%0AEND:VCALENDAR`;
}

function SubmissionDetail({ submission, isVP, members }: { submission: PDPSubmission; isVP: boolean; members: any[] }) {
  const updateStatus = useUpdateSubmissionStatus();
  const { data: comments } = usePDPComments(submission.id);
  const addComment = useAddComment();
  const [comment, setComment] = useState('');

  const memberName = useMemo(() => {
    const m = members?.find(p => p.user_id === submission.user_id);
    return m ? `${m.first_name} ${m.last_name}` : 'Unknown';
  }, [members, submission.user_id]);

  const statusColors: Record<string, string> = {
    submitted: 'text-blue-700 bg-blue-500/10 border-blue-500/30',
    complete: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
    incomplete: 'text-red-700 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className="p-3 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-foreground">{memberName}</p>
        <Badge variant="outline" className={`text-xs border ${statusColors[submission.status]}`}>
          {submission.status}
        </Badge>
      </div>

      {submission.content && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.content}</p>
      )}

      {submission.file_urls?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submission.file_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              Attachment {i + 1}
            </a>
          ))}
        </div>
      )}

      {isVP && submission.status === 'submitted' && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus.mutate({ id: submission.id, status: 'complete' })}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
          </Button>
          <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus.mutate({ id: submission.id, status: 'incomplete' })}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Incomplete
          </Button>
        </div>
      )}

      {/* Comments */}
      {comments && comments.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {comments.map(c => {
            const author = members?.find(m => m.user_id === c.user_id);
            return (
              <div key={c.id} className="text-xs">
                <span className="font-medium text-foreground">
                  {author ? `${author.first_name} ${author.last_name}` : 'Unknown'}
                </span>
                <span className="text-muted-foreground ml-2">{c.content}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="text-sm h-8"
          onKeyDown={e => {
            if (e.key === 'Enter' && comment.trim()) {
              addComment.mutate({ submission_id: submission.id, content: comment.trim() });
              setComment('');
            }
          }}
        />
        <Button size="sm" variant="ghost" className="h-8 px-2" disabled={!comment.trim()} onClick={() => {
          addComment.mutate({ submission_id: submission.id, content: comment.trim() });
          setComment('');
        }}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, isVP, isNewMember, mySubmission, allSubmissions, members }: {
  assignment: PDPAssignment;
  isVP: boolean;
  isNewMember: boolean;
  mySubmission?: PDPSubmission;
  allSubmissions?: PDPSubmission[];
  members: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [content, setContent] = useState(mySubmission?.content || '');
  const submitAssignment = useSubmitAssignment();

  const overdue = isPast(new Date(assignment.due_date));
  const daysLeft = differenceInDays(new Date(assignment.due_date), new Date());

  const handleSubmit = () => {
    submitAssignment.mutate(
      { assignment_id: assignment.id, content: content || undefined },
      { onSuccess: () => setSubmitOpen(false) }
    );
  };

  const submittedCount = allSubmissions?.length || 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {mySubmission?.status === 'complete' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : mySubmission?.status === 'incomplete' ? (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : mySubmission ? (
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <h4 className="font-semibold text-foreground text-sm">{assignment.title}</h4>
            </div>
            {assignment.description && (
              <p className="text-xs text-muted-foreground ml-6">{assignment.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {/* Delete handled at parent level */}
          </div>
        </div>

        <div className="flex items-center justify-between ml-6">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3 inline mr-1" />
              {overdue ? 'Overdue' : `Due ${format(new Date(assignment.due_date), 'MMM d')}`}
              {!overdue && daysLeft <= 3 && ` (${daysLeft}d left)`}
            </span>

            {/* Calendar add buttons */}
            <div className="flex gap-1">
              {(['google', 'outlook', 'apple'] as const).map(type => (
                <a
                  key={type}
                  href={generateCalendarUrl(type, assignment)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-primary hover:underline"
                >
                  {type === 'google' ? 'Google' : type === 'outlook' ? 'Outlook' : 'Apple'}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVP && (
              <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline">
                {submittedCount} submission{submittedCount !== 1 ? 's' : ''}
              </button>
            )}

            {isNewMember && !mySubmission && (
              <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Send className="h-3 w-3 mr-1" /> Submit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Submit: {assignment.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Your response..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      File uploads coming soon. Use text for now.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
                      <Button onClick={handleSubmit} disabled={submitAssignment.isPending}>
                        {submitAssignment.isPending ? 'Submitting...' : 'Submit'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {isNewMember && mySubmission && (
              <Badge variant="outline" className={`text-xs ${
                mySubmission.status === 'complete' ? 'text-emerald-700 bg-emerald-500/10' :
                mySubmission.status === 'incomplete' ? 'text-red-700 bg-red-500/10' :
                'text-blue-700 bg-blue-500/10'
              }`}>
                {mySubmission.status === 'complete' ? 'Complete' : mySubmission.status === 'incomplete' ? 'Incomplete' : 'Submitted'}
              </Badge>
            )}
          </div>
        </div>

        {/* Expanded submissions view for VPs */}
        {expanded && isVP && allSubmissions && (
          <div className="space-y-2 mt-3 pt-3 border-t">
            {allSubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
            ) : (
              allSubmissions.map(sub => (
                <SubmissionDetail key={sub.id} submission={sub} isVP={isVP} members={members} />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PDPAssignments({ isVP, isNewMember }: Props) {
  const { data: assignments, isLoading } = usePDPAssignments();
  const { data: mySubmissions } = useMySubmissions();
  const { data: allSubmissions } = usePDPSubmissions();
  const { data: members } = useMembers();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleCreate = () => {
    if (!title || !dueDate) return;
    createAssignment.mutate(
      { title, description: description || undefined, due_date: new Date(dueDate).toISOString() },
      { onSuccess: () => { setTitle(''); setDescription(''); setDueDate(''); setCreateOpen(false); } }
    );
  };

  // Checklist summary for new members
  const completedCount = useMemo(() => {
    if (!assignments || !mySubmissions) return 0;
    return mySubmissions.filter(s => s.status === 'complete').length;
  }, [assignments, mySubmissions]);

  const totalAssignments = assignments?.length || 0;
  const progressPct = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + Create */}
      <div className="flex items-center justify-between">
        {isNewMember && totalAssignments > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{completedCount}/{totalAssignments} complete</span>
            <Progress value={progressPct} className="w-32 h-1.5" />
          </div>
        )}
        {!isNewMember && <div />}
        {isVP && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createAssignment.isPending || !title || !dueDate}>
                    {createAssignment.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Assignment list */}
      {!assignments || assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description={isVP ? "Create the first assignment for the new member class." : "Assignments will appear here when created by your VP."}
        />
      ) : (
        <div className="space-y-3">
          {assignments.map(assignment => {
            const mySub = mySubmissions?.find(s => s.assignment_id === assignment.id);
            const assignSubs = allSubmissions?.filter(s => s.assignment_id === assignment.id);
            return (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                isVP={isVP}
                isNewMember={isNewMember}
                mySubmission={mySub}
                allSubmissions={assignSubs}
                members={members || []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
