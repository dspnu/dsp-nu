import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LifeBuoy, MessageSquare, CheckCircle2, Clock, PlayCircle, User as UserIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useCareerHelpRequests, useCanTriageCareerHelp, useUpdateCareerHelpStatus,
  type CareerHelpRequest,
} from '../hooks/useCareerHelp';
import { RequestHelpDialog } from './RequestHelpDialog';

const STATUS_META: Record<CareerHelpRequest['status'], { label: string; icon: React.ElementType; className: string }> = {
  open: { label: 'Open', icon: Clock, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  in_progress: { label: 'In progress', icon: PlayCircle, className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};

function RequestCard({ r, canTriage }: { r: CareerHelpRequest; canTriage: boolean }) {
  const update = useUpdateCareerHelpStatus();
  const meta = STATUS_META[r.status];
  const Icon = meta.icon;
  const requesterName = [r.requester?.first_name, r.requester?.last_name].filter(Boolean).join(' ') || r.requester?.email || 'Member';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{r.subject}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            {canTriage && (
              <>
                <UserIcon className="h-3 w-3" />
                <span>{requesterName}</span>
                <span>·</span>
              </>
            )}
            {r.tool && <><span className="uppercase tracking-wide">{r.tool.replace('_', ' ')}</span><span>·</span></>}
            <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 gap-1 ${meta.className}`}>
          <Icon className="h-3 w-3" /> {meta.label}
        </Badge>
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{r.message}</p>
      {canTriage && r.status !== 'resolved' && (
        <div className="flex gap-2 pt-1">
          {r.status === 'open' && (
            <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: r.id, status: 'in_progress' })}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Claim
            </Button>
          )}
          <Button size="sm" onClick={() => update.mutate({ id: r.id, status: 'resolved' })}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark resolved
          </Button>
        </div>
      )}
    </Card>
  );
}

export function HelpRequestsTab() {
  const { data: canTriage } = useCanTriageCareerHelp();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const effectiveScope = canTriage ? scope : 'mine';
  const { data, isLoading } = useCareerHelpRequests(effectiveScope);

  const grouped = useMemo(() => {
    const open = (data ?? []).filter(r => r.status !== 'resolved');
    const resolved = (data ?? []).filter(r => r.status === 'resolved');
    return { open, resolved };
  }, [data]);

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Request help from a chair</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ping the VP of Professional Activities and Professionalism chairs directly.
              </p>
            </div>
          </div>
          <RequestHelpDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> New request
              </Button>
            }
          />
        </div>
      </Card>

      {canTriage && (
        <Tabs value={scope} onValueChange={(v) => setScope(v as 'mine' | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All requests</TabsTrigger>
            <TabsTrigger value="mine">My requests</TabsTrigger>
          </TabsList>
          <TabsContent value={scope} className="mt-4 space-y-4">
            <RequestsBody isLoading={isLoading} grouped={grouped} canTriage={!!canTriage} />
          </TabsContent>
        </Tabs>
      )}

      {!canTriage && (
        <div className="space-y-4">
          <RequestsBody isLoading={isLoading} grouped={grouped} canTriage={false} />
        </div>
      )}
    </div>
  );
}

function RequestsBody({
  isLoading, grouped, canTriage,
}: {
  isLoading: boolean;
  grouped: { open: CareerHelpRequest[]; resolved: CareerHelpRequest[] };
  canTriage: boolean;
}) {
  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>;
  }
  if (!grouped.open.length && !grouped.resolved.length) {
    return (
      <Card className="p-8 text-center">
        <LifeBuoy className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      </Card>
    );
  }
  return (
    <>
      {!!grouped.open.length && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Active</h3>
          {grouped.open.map(r => <RequestCard key={r.id} r={r} canTriage={canTriage} />)}
        </div>
      )}
      {!!grouped.resolved.length && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</h3>
          {grouped.resolved.map(r => <RequestCard key={r.id} r={r} canTriage={canTriage} />)}
        </div>
      )}
    </>
  );
}
