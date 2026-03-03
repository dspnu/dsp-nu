import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Minus, Clock, Coffee, ClipboardList } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { PDPAssignment, PDPSubmission } from '@/hooks/usePDPAssignments';

interface MemberDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { first_name: string; last_name: string; user_id: string } | null;
  assignments: PDPAssignment[];
  submissions: PDPSubmission[];
  coffeeChats: any[];
  approvedMembers: any[];
  members: any[];
}

export function MemberDetailDialog({
  open, onOpenChange, member, assignments, submissions, coffeeChats, approvedMembers, members,
}: MemberDetailDialogProps) {
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const memberSubmissions = useMemo(() =>
    submissions?.filter(s => s.user_id === member?.user_id) || [],
    [submissions, member]
  );

  const memberChats = useMemo(() =>
    coffeeChats?.filter(c => c.initiator_id === member?.user_id && c.status === 'completed') || [],
    [coffeeChats, member]
  );

  const getPartnerName = (partnerId: string) => {
    const approved = approvedMembers?.find(m => m.id === partnerId);
    if (approved) return `${approved.first_name} ${approved.last_name}`;
    const profile = members?.find(m => m.user_id === partnerId);
    if (profile) return `${profile.first_name} ${profile.last_name}`;
    return 'Unknown';
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{member.first_name} {member.last_name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Assignments Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4" />
                Assignments ({memberSubmissions.filter(s => s.status === 'complete').length}/{assignments.length} complete)
              </h3>
              <div className="space-y-2">
                {assignments.map(a => {
                  const sub = memberSubmissions.find(s => s.assignment_id === a.id);
                  const overdue = isPast(new Date(a.due_date));
                  let status = 'not_due';
                  if (sub) status = sub.status;
                  else if (overdue) status = 'missing';

                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon status={status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(a.due_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={status} />
                        {sub?.content && (
                          <Badge variant="secondary" className="text-[10px]">Text</Badge>
                        )}
                        {sub?.file_urls && sub.file_urls.length > 0 && (
                          <div className="flex gap-1">
                            {sub.file_urls.map((path, i) => (
                              <button
                                key={i}
                                className="text-[10px] text-primary underline"
                                onClick={async () => {
                                  if (fileUrls[path]) {
                                    window.open(fileUrls[path], '_blank');
                                    return;
                                  }
                                  const { data } = await supabase.storage.from('pdp-submissions').createSignedUrl(path, 3600);
                                  if (data?.signedUrl) {
                                    setFileUrls(prev => ({ ...prev, [path]: data.signedUrl }));
                                    window.open(data.signedUrl, '_blank');
                                  }
                                }}
                              >
                                File {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coffee Chats Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Coffee className="h-4 w-4" />
                Coffee Chats ({memberChats.length} completed)
              </h3>
              {memberChats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No completed coffee chats yet</p>
              ) : (
                <div className="space-y-2">
                  {memberChats.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {getPartnerName(chat.partner_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(chat.chat_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10">
                        Completed
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case 'submitted':
      return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
    case 'incomplete':
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
    submitted: 'text-blue-700 bg-blue-500/10 border-blue-500/30',
    incomplete: 'text-red-700 bg-red-500/10 border-red-500/30',
    missing: 'text-red-700 bg-red-500/10 border-red-500/30',
    not_due: 'text-muted-foreground bg-muted border-muted-foreground/30',
  };
  const labels: Record<string, string> = {
    complete: 'Complete',
    submitted: 'Submitted',
    incomplete: 'Incomplete',
    missing: 'Missing',
    not_due: 'Not yet due',
  };
  return (
    <Badge variant="outline" className={`text-[10px] border ${styles[status] || styles.not_due}`}>
      {labels[status] || 'Pending'}
    </Badge>
  );
}
