import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/core/auth/AuthContext';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useTicketedEvents, useTicketedEventAdmin } from '@/features/ticketing/hooks/useTicketedEvents';
import {
  useMyTickets,
  useTicketsForEvent,
  useTicketCounts,
  type TicketWithEvent,
} from '@/features/ticketing/hooks/useEventTickets';
import {
  useAssignTicket,
  useCancelMyTicket,
  useCheckInTicket,
  useClaimTicket,
  useUpdateTicketPayment,
} from '@/features/ticketing/hooks/useTicketMutations';
import { TicketedEventFormDialog } from '@/features/ticketing/components/TicketedEventFormDialog';
import { TicketQrBlock } from '@/features/ticketing/components/TicketQrBlock';
import { TicketCheckInTools } from '@/features/ticketing/components/TicketCheckInTools';
import { format } from 'date-fns';
import { ExternalLink, Loader2, Ticket as TicketIcon } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type TicketedEvent = Tables<'ticketed_events'>;

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function admissionReady(ev: TicketedEvent, t: { payment_status: string }) {
  if (ev.price_cents <= 0) return true;
  return t.payment_status === 'paid' || t.payment_status === 'waived';
}

export default function TicketsPage() {
  const { canManageEvents } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const verifyParam = searchParams.get('verify');
  const ticketedEventIdParam = searchParams.get('ticketedEventId');

  const defaultTab = canManageEvents ? 'browse' : 'browse';
  const [tab, setTab] = useState(tabParam === 'my' || tabParam === 'admin' ? tabParam : defaultTab);
  const [adminEventId, setAdminEventId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [assignUserId, setAssignUserId] = useState<string>('');

  const { data: browseEvents, isLoading: browseLoading } = useTicketedEvents();
  const { data: adminEvents, isLoading: adminLoading } = useTicketedEventAdmin();
  const { data: myTickets, isLoading: mineLoading } = useMyTickets();
  const { data: members } = useMembers();

  const claim = useClaimTicket();
  const cancelTicket = useCancelMyTicket();
  const assignTicket = useAssignTicket();
  const updatePayment = useUpdateTicketPayment();
  const checkIn = useCheckInTicket();

  const myEventIds = useMemo(
    () => new Set((myTickets ?? []).map((t) => t.ticketed_event_id)),
    [myTickets]
  );

  useEffect(() => {
    if (tabParam === 'my' || tabParam === 'admin') setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (ticketedEventIdParam) setTab('browse');
  }, [ticketedEventIdParam]);

  useEffect(() => {
    if (verifyParam && canManageEvents) {
      setTab('admin');
    }
  }, [verifyParam, canManageEvents]);

  useEffect(() => {
    if (adminEvents?.length && !adminEventId) {
      setAdminEventId(adminEvents[0].id);
    }
  }, [adminEvents, adminEventId]);

  useEffect(() => {
    if (ticketedEventIdParam && canManageEvents) {
      setAdminEventId(ticketedEventIdParam);
    }
  }, [ticketedEventIdParam, canManageEvents]);

  const effectiveBrowseEvents = useMemo(() => {
    if (!browseEvents) return browseEvents;
    if (!ticketedEventIdParam) return browseEvents;
    return browseEvents.filter((e) => e.id === ticketedEventIdParam);
  }, [browseEvents, ticketedEventIdParam]);

  const onTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === 'browse') next.delete('tab');
    else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const { data: adminTickets, isLoading: ticketsLoading } = useTicketsForEvent(adminEventId);
  const { data: regCount } = useTicketCounts(adminEventId);

  const selectedAdminEvent = adminEvents?.find((e) => e.id === adminEventId);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        !q ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const memberNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => {
      map.set(m.user_id, `${m.first_name} ${m.last_name}`);
    });
    return map;
  }, [members]);

  const clearVerifyParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('verify');
    setSearchParams(next, { replace: true });
  };

  const handleCheckInCode = (code: string) => {
    checkIn.mutate(code, { onSettled: clearVerifyParam });
  };

  const renderBrowse = () => {
    if (browseLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (!effectiveBrowseEvents?.length) {
      return (
        <EmptyState
          icon={TicketIcon}
          title="No ticketed events"
          description="When brotherhood events with tickets are published, they will show up here."
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {effectiveBrowseEvents.map((ev) => {
          const hasTicket = myEventIds.has(ev.id);
          return (
            <Card key={ev.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg leading-snug">{ev.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(ev.starts_at), 'PPp')}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {ev.description && (
                  <p className="text-sm text-muted-foreground line-clamp-4">{ev.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-sm">
                  {ev.price_cents > 0 ? (
                    <Badge variant="secondary">{formatMoney(ev.price_cents)}</Badge>
                  ) : (
                    <Badge variant="outline">Free</Badge>
                  )}
                  {ev.capacity != null && <Badge variant="outline">Cap {ev.capacity}</Badge>}
                </div>
                {hasTicket ? (
                  <p className="text-sm font-medium text-primary">You have a ticket — see My Tickets.</p>
                ) : (
                  <Button
                    size="sm"
                    disabled={claim.isPending || !ev.registrations_open}
                    onClick={() => claim.mutate(ev.id)}
                  >
                    {ev.registrations_open ? 'Claim ticket' : 'Registration closed'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMyTickets = () => {
    if (mineLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (!myTickets?.length) {
      return (
        <EmptyState
          icon={TicketIcon}
          title="No tickets yet"
          description="Browse events and claim a ticket to see it here."
        />
      );
    }
    return (
      <div className="space-y-6">
        {myTickets.map((row: TicketWithEvent) => {
          const ev = row.ticketed_events;
          const ready = admissionReady(ev, row);
          return (
            <Card key={row.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{ev.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ev.starts_at), 'PPp')}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={
                        row.payment_status === 'pending' && ev.price_cents > 0 ? 'destructive' : 'secondary'
                      }
                    >
                      {ev.price_cents > 0 ? row.payment_status : 'confirmed'}
                    </Badge>
                    {row.checked_in_at && <Badge>Checked in</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ev.price_cents > 0 && row.payment_status === 'pending' && ev.payment_url && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" asChild variant="default">
                      {ev.payment_url_internal && ev.payment_url.startsWith('/') ? (
                        <Link to={ev.payment_url} className="gap-1">
                          Pay in portal
                        </Link>
                      ) : (
                        <a
                          href={ev.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="gap-1"
                        >
                          Pay now <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      After paying, an officer will mark you paid so your QR activates.
                    </span>
                  </div>
                )}
                {ready && !row.checked_in_at && (
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                    <TicketQrBlock ticket={row} />
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Show this QR at the door. Officers can also check you in with the code below the QR.
                    </p>
                  </div>
                )}
                {!ready && ev.price_cents > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your QR will appear after payment is confirmed.
                  </p>
                )}
                {!row.checked_in_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Cancel this ticket?')) cancelTicket.mutate(row.id);
                    }}
                  >
                    Cancel ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderAdmin = () => {
    if (!canManageEvents) return null;
    if (adminLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <TicketedEventFormDialog />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Events & registrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adminEvents?.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setAdminEventId(ev.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    adminEventId === ev.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(ev.starts_at), 'PPp')} ·{' '}
                    {ev.registrations_open ? 'Open' : 'Closed'} · {ev.published ? 'Live' : 'Draft'}
                  </div>
                </button>
              ))}
              {!adminEvents?.length && (
                <p className="text-sm text-muted-foreground">Create an event to manage tickets.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <TicketCheckInTools
              initialCode={verifyParam}
              onCode={handleCheckInCode}
            />
            {selectedAdminEvent && (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-base">{selectedAdminEvent.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registrations: {regCount ?? '—'}
                      {selectedAdminEvent.capacity != null
                        ? ` / ${selectedAdminEvent.capacity}`
                        : ' (no cap)'}
                    </p>
                  </div>
                  <TicketedEventFormDialog
                    event={selectedAdminEvent}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 border-b pb-3">
                    <Input
                      placeholder="Search members…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="max-w-xs"
                    />
                    <Select value={assignUserId} onValueChange={setAssignUserId}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredMembers.slice(0, 80).map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.first_name} {m.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!assignUserId || !adminEventId}
                      onClick={() => {
                        if (!adminEventId || !assignUserId) return;
                        assignTicket.mutate({
                          ticketedEventId: adminEventId,
                          userId: assignUserId,
                          waivePayment: false,
                        });
                        setAssignUserId('');
                      }}
                    >
                      Assign (pending payment)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!assignUserId || !adminEventId}
                      onClick={() => {
                        if (!adminEventId || !assignUserId) return;
                        assignTicket.mutate({
                          ticketedEventId: adminEventId,
                          userId: assignUserId,
                          waivePayment: true,
                        });
                        setAssignUserId('');
                      }}
                    >
                      Assign + waive
                    </Button>
                  </div>

                  {ticketsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminTickets?.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              {memberNameByUserId.get(t.user_id) ?? t.user_id}
                              <div className="text-xs text-muted-foreground font-mono">{t.check_in_code}</div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={t.payment_status}
                                onValueChange={(v) => {
                                  if (!selectedAdminEvent) return;
                                  updatePayment.mutate({
                                    ticketId: t.id,
                                    userId: t.user_id,
                                    ticketedEventId: selectedAdminEvent.id,
                                    eventTitle: selectedAdminEvent.title,
                                    paymentStatus: v as 'paid' | 'pending' | 'waived',
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">pending</SelectItem>
                                  <SelectItem value="paid">paid</SelectItem>
                                  <SelectItem value="waived">waived</SelectItem>
                                  <SelectItem value="not_required">n/a</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm">
                              {t.checked_in_at
                                ? format(new Date(t.checked_in_at), 'PPp')
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(t.check_in_code);
                                  toast({ title: 'Code copied' });
                                }}
                              >
                                Copy code
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader title="Brotherhood tickets" className="mb-4" />

      {ticketedEventIdParam && (
        <Card className="mb-4 border-primary/20 bg-primary/[0.05]">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Showing tickets for an event</p>
              <p className="text-xs text-muted-foreground truncate">{ticketedEventIdParam}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('ticketedEventId');
                setSearchParams(next, { replace: true });
              }}
            >
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Events</TabsTrigger>
          <TabsTrigger value="my">My tickets</TabsTrigger>
          {canManageEvents && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="browse">{renderBrowse()}</TabsContent>
        <TabsContent value="my">{renderMyTickets()}</TabsContent>
        {canManageEvents && <TabsContent value="admin">{renderAdmin()}</TabsContent>}
      </Tabs>
    </AppLayout>
  );
}
