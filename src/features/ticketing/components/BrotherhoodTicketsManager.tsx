import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  useDeleteTicketedEvent,
  useUpdateTicketPayment,
} from '@/features/ticketing/hooks/useTicketMutations';
import { TicketedEventFormDialog } from '@/features/ticketing/components/TicketedEventFormDialog';
import { TicketQrBlock } from '@/features/ticketing/components/TicketQrBlock';
import { TicketCheckInTools } from '@/features/ticketing/components/TicketCheckInTools';
import { DigitalTicket } from '@/features/ticketing/components/DigitalTicket';
import { format } from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
  Ticket as TicketIcon,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import {
  downloadBrotherhoodTicketPass,
  isAppleWalletPassConfigured,
  isLikelyIos,
} from '@/features/ticketing/lib/downloadAppleWalletPass';
import {
  isCloverCheckoutUiEnabled,
  useCreateCloverCheckout,
} from '@/features/payments/hooks/useCloverCheckout';

type TicketedEvent = Tables<'ticketed_events'>;

export type BrotherhoodTicketsTab = 'browse' | 'my' | 'admin';

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function admissionReady(ev: TicketedEvent, t: { payment_status: string }) {
  if (ev.price_cents <= 0) return true;
  return t.payment_status === 'paid' || t.payment_status === 'waived';
}

export interface BrotherhoodTicketsManagerProps {
  /** When true, syncs the active tab and deep-link params with the router (standalone /tickets page). */
  syncRouterSearchParams?: boolean;
  /** Used when `syncRouterSearchParams` is false; also the fallback initial tab when syncing. */
  defaultTab?: BrotherhoodTicketsTab;
}

export function BrotherhoodTicketsManager({
  syncRouterSearchParams = false,
  defaultTab = 'browse',
}: BrotherhoodTicketsManagerProps) {
  const { canManageEvents, profile } = useAuth();
  const memberName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email
    : undefined;
  const { toast } = useToast();
  const createCloverCheckout = useCreateCloverCheckout();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = syncRouterSearchParams ? searchParams.get('tab') : null;
  const verifyParam = syncRouterSearchParams ? searchParams.get('verify') : null;
  const ticketedEventIdParam = syncRouterSearchParams ? searchParams.get('ticketedEventId') : null;

  const resolvedDefault =
    canManageEvents && defaultTab === 'admin' ? 'admin' : defaultTab === 'my' ? 'my' : 'browse';

  const [tab, setTab] = useState<BrotherhoodTicketsTab>(() => {
    if (syncRouterSearchParams && (tabParam === 'my' || tabParam === 'admin')) {
      return tabParam;
    }
    return resolvedDefault;
  });

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
  const deleteEvent = useDeleteTicketedEvent();
  const updatePayment = useUpdateTicketPayment();
  const checkIn = useCheckInTicket();
  const [walletPassLoadingId, setWalletPassLoadingId] = useState<string | null>(null);

  const myEventIds = useMemo(
    () => new Set((myTickets ?? []).map((t) => t.ticketed_event_id)),
    [myTickets]
  );

  useEffect(() => {
    if (!syncRouterSearchParams) return;
    if (tabParam === 'my' || tabParam === 'admin') setTab(tabParam);
  }, [tabParam, syncRouterSearchParams]);

  useEffect(() => {
    if (!syncRouterSearchParams) return;
    if (ticketedEventIdParam) setTab('browse');
  }, [ticketedEventIdParam, syncRouterSearchParams]);

  useEffect(() => {
    if (!syncRouterSearchParams) return;
    if (verifyParam && canManageEvents) {
      setTab('admin');
    }
  }, [verifyParam, canManageEvents, syncRouterSearchParams]);

  useEffect(() => {
    if (adminEvents?.length && !adminEventId) {
      setAdminEventId(adminEvents[0].id);
    }
  }, [adminEvents, adminEventId]);

  useEffect(() => {
    if (!syncRouterSearchParams) return;
    if (ticketedEventIdParam && canManageEvents) {
      setAdminEventId(ticketedEventIdParam);
    }
  }, [ticketedEventIdParam, canManageEvents, syncRouterSearchParams]);

  const effectiveBrowseEvents = useMemo(() => {
    if (!browseEvents) return browseEvents;
    if (!ticketedEventIdParam) return browseEvents;
    return browseEvents.filter((e) => e.id === ticketedEventIdParam);
  }, [browseEvents, ticketedEventIdParam]);

  const onTabChange = (v: string) => {
    const next = v as BrotherhoodTicketsTab;
    setTab(next);
    if (!syncRouterSearchParams) return;
    const sp = new URLSearchParams(searchParams);
    if (next === 'browse') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
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
    if (!syncRouterSearchParams) return;
    const next = new URLSearchParams(searchParams);
    next.delete('verify');
    setSearchParams(next, { replace: true });
  };

  const handleCheckInCode = (code: string) => {
    checkIn.mutate(code, { onSettled: syncRouterSearchParams ? clearVerifyParam : undefined });
  };

  const handleClaim = (eventId: string) => {
    claim.mutate(eventId, {
      onSuccess: (res) => {
        if (res?.ok) {
          setTab('my');
          if (syncRouterSearchParams) {
            const sp = new URLSearchParams(searchParams);
            sp.set('tab', 'my');
            setSearchParams(sp, { replace: true });
          }
        }
      },
    });
  };

  const hueFromString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return 250 + (Math.abs(h) % 70);
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

    const now = Date.now();
    const upcoming = [...effectiveBrowseEvents]
      .filter((e) => new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const past = effectiveBrowseEvents.filter((e) => new Date(e.starts_at).getTime() < now);
    const hero = upcoming[0];
    const rest = upcoming.slice(1);

    const renderHero = (ev: TicketedEvent) => {
      const hasTicket = myEventIds.has(ev.id);
      const hue = hueFromString(ev.title);
      return (
        <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-border">
          <div
            className="relative aspect-[16/10] sm:aspect-[5/2]"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 75% 32%) 0%, hsl(${hue + 25} 70% 48%) 55%, hsl(${hue + 45} 75% 60%) 100%)`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 85% 75%, rgba(0,0,0,0.4) 0, transparent 45%)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white ring-1 ring-white/20">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
              {hasTicket && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg">
                  <CheckCircle2 className="h-3 w-3" />
                  You're in
                </span>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                {ev.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(ev.starts_at), 'EEE, MMM d · p')}
                </span>
                {ev.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {ev.location}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {ev.price_cents > 0 ? (
                    <span className="rounded-full bg-white/15 backdrop-blur-md px-3 py-1 ring-1 ring-white/20">
                      {formatMoney(ev.price_cents)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/15 backdrop-blur-md px-3 py-1 ring-1 ring-white/20">
                      Free
                    </span>
                  )}
                  {ev.capacity != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 ring-1 ring-white/20">
                      <Users className="h-3.5 w-3.5" />
                      {ev.capacity}
                    </span>
                  )}
                </div>
                {hasTicket ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white text-foreground hover:bg-white/90"
                    onClick={() => setTab('my')}
                  >
                    View my ticket
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-white text-foreground hover:bg-white/90 font-bold shadow-lg"
                    disabled={claim.isPending || !ev.registrations_open}
                    onClick={() => handleClaim(ev.id)}
                  >
                    {claim.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {ev.registrations_open ? 'Reserve your spot' : 'Registration closed'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const renderListItem = (ev: TicketedEvent) => {
      const hasTicket = myEventIds.has(ev.id);
      const hue = hueFromString(ev.title);
      const isPast = new Date(ev.starts_at).getTime() < now;
      return (
        <div
          key={ev.id}
          className="group flex items-center gap-4 rounded-2xl border bg-card p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-border"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 70% 38%), hsl(${hue + 30} 70% 55%))`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-40 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6) 0, transparent 50%)',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
                {format(new Date(ev.starts_at), 'MMM')}
              </div>
              <div className="text-2xl font-extrabold leading-none">
                {format(new Date(ev.starts_at), 'd')}
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground">{ev.title}</p>
              {hasTicket && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yours
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {format(new Date(ev.starts_at), 'EEE, MMM d · p')}
              {ev.location ? ` · ${ev.location}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {ev.price_cents > 0 ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {formatMoney(ev.price_cents)}
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Free
                </Badge>
              )}
              {ev.capacity != null && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Cap {ev.capacity}
                </Badge>
              )}
            </div>
          </div>
          {!isPast && !hasTicket && (
            <Button
              size="sm"
              variant="outline"
              disabled={claim.isPending || !ev.registrations_open}
              onClick={() => handleClaim(ev.id)}
              className="shrink-0"
            >
              {ev.registrations_open ? 'Claim' : 'Closed'}
            </Button>
          )}
          {!isPast && hasTicket && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTab('my')}
              className="shrink-0"
            >
              View
            </Button>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {hero && renderHero(hero)}
        {rest.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Up next
            </h4>
            <div className="space-y-2">{rest.map(renderListItem)}</div>
          </div>
        )}
        {past.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Past events
            </h4>
            <div className="space-y-2 opacity-70">{past.map(renderListItem)}</div>
          </div>
        )}
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
          const statusBadges = (
            <>
              <Badge
                variant={
                  row.payment_status === 'pending' && ev.price_cents > 0
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {ev.price_cents > 0 ? row.payment_status : 'confirmed'}
              </Badge>
              {ev.price_cents > 0 && (
                <Badge variant="outline" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">
                  {formatMoney(ev.price_cents)}
                </Badge>
              )}
              {row.checked_in_at && <Badge>Checked in</Badge>}
            </>
          );

          const actions = (
            <>
              {ev.price_cents > 0 && row.payment_status === 'pending' && ev.payment_url && (
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
              )}
              {isCloverCheckoutUiEnabled() &&
                ev.price_cents > 0 &&
                row.payment_status === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={createCloverCheckout.isPending}
                    onClick={() =>
                      createCloverCheckout.mutate(
                        {
                          purpose: 'ticket',
                          amountCents: ev.price_cents,
                          eventTicketId: row.id,
                        },
                        {
                          onSuccess: (res) => {
                            window.open(res.url, '_blank', 'noopener,noreferrer');
                          },
                        }
                      )
                    }
                  >
                    {createCloverCheckout.isPending ? 'Creating…' : 'Pay with Clover'}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              {ready &&
                !row.checked_in_at &&
                isAppleWalletPassConfigured() &&
                isLikelyIos() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={walletPassLoadingId === row.id}
                    onClick={async () => {
                      setWalletPassLoadingId(row.id);
                      try {
                        await downloadBrotherhoodTicketPass(row.id);
                      } catch (e) {
                        toast({
                          title: 'Could not add pass',
                          description: e instanceof Error ? e.message : 'Unknown error',
                          variant: 'destructive',
                        });
                      } finally {
                        setWalletPassLoadingId(null);
                      }
                    }}
                  >
                    {walletPassLoadingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <WalletCards className="h-4 w-4" />
                    )}
                    Add to Apple Wallet
                  </Button>
                )}
              {!row.checked_in_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground"
                  onClick={() => {
                    if (confirm('Cancel this ticket?')) cancelTicket.mutate(row.id);
                  }}
                >
                  Cancel ticket
                </Button>
              )}
            </>
          );

          const footer = (
            <>
              {ready && !row.checked_in_at && (
                <p className="text-xs text-muted-foreground">
                  Show the QR at the door, or have an officer enter the code below it.
                </p>
              )}
              {!ready && ev.price_cents > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your QR will appear here once payment is confirmed.
                </p>
              )}
              {ev.price_cents > 0 && row.payment_status === 'pending' && ev.payment_url && (
                <p className="mt-1 text-xs text-muted-foreground">
                  After paying, an officer will mark you paid so your QR activates.
                </p>
              )}
            </>
          );

          return (
            <DigitalTicket
              key={row.id}
              ticket={row}
              event={ev}
              ready={ready}
              statusBadges={statusBadges}
              actions={actions}
              footer={footer}
              passengerName={memberName}
            />

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
              initialCode={verifyParam ?? undefined}
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
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteEvent.isPending}
                    onClick={async () => {
                      if (!selectedAdminEvent) return;
                      const ok = confirm(
                        `Delete "${selectedAdminEvent.title}"? This also deletes all tickets for this event.`
                      );
                      if (!ok) return;
                      await deleteEvent.mutateAsync(selectedAdminEvent.id);
                      setAdminEventId(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
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
    <div className="space-y-4">
      {syncRouterSearchParams && ticketedEventIdParam && (
        <Card className="border-primary/20 bg-primary/[0.05]">
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
    </div>
  );
}
