import { ReactNode } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Ticket as TicketIcon } from 'lucide-react';
import { TicketQrBlock } from './TicketQrBlock';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type EventTicket = Tables<'event_tickets'>;
type TicketedEvent = Tables<'ticketed_events'>;

interface DigitalTicketProps {
  ticket: EventTicket;
  event: TicketedEvent;
  ready: boolean;
  statusBadges?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  passengerName?: string;
}

/** Deterministic hue from event title — gives each event a unique "cover" while staying in brand. */
function hueFromString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  // Keep within a purple-leaning band: 250–320
  return 250 + (Math.abs(h) % 70);
}

function Field({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <div className={cn(align === 'right' && 'text-right')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

export function DigitalTicket({
  ticket,
  event,
  ready,
  statusBadges,
  actions,
  footer,
  passengerName,
}: DigitalTicketProps) {
  const start = new Date(event.starts_at);
  const ticketShort = ticket.check_in_code.slice(-6).toUpperCase();
  const refCode = `DSP-${ticketShort}`;
  const hue = hueFromString(event.title);
  const checkedIn = !!ticket.checked_in_at;

  const statusLabel = checkedIn
    ? 'Checked In'
    : ready
      ? 'Valid Entry'
      : ticket.payment_status === 'pending'
        ? 'Payment Pending'
        : 'Pending';

  const statusTone = checkedIn
    ? 'bg-foreground text-background'
    : ready
      ? 'bg-emerald-500 text-white'
      : 'bg-amber-500 text-white';

  const StatusIcon = checkedIn ? CheckCircle2 : ready ? CheckCircle2 : Clock;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Soft brand glow */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-[2rem] opacity-30 blur-xl"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${hue + 30} 70% 55%))`,
        }}
      />

      <div className="relative overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border">
        {/* COVER */}
        <div
          className="relative h-28"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 75% 38%) 0%, hsl(${hue + 25} 70% 50%) 60%, hsl(${hue + 45} 75% 60%) 100%)`,
          }}
        >
          {/* subtle pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.3) 0, transparent 45%)',
            }}
          />
          <div className="absolute top-3 left-4 flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            <TicketIcon className="h-3 w-3" />
            E-Ticket
          </div>
          {/* Floating status badge */}
          <div
            className={cn(
              'absolute -bottom-3 left-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-lg ring-4 ring-card',
              statusTone,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusLabel}
          </div>
        </div>

        {/* INFO */}
        <div className="px-6 pt-7 pb-5 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Event
            </p>
            <h3 className="text-lg font-extrabold leading-tight text-foreground line-clamp-2">
              {event.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-3">
            <Field label="Date" value={format(start, 'MMM d, yyyy')} />
            <Field label="Time" value={format(start, 'p')} align="right" />
            <Field label="Name" value={passengerName ?? 'Member'} />
            <Field label="Ticket" value={`#${ticketShort}`} align="right" />
            {event.location && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Place
                </p>
                <p className="text-sm font-bold text-foreground">{event.location}</p>
              </div>
            )}
          </div>

          {statusBadges && (
            <div className="flex flex-wrap gap-1.5">{statusBadges}</div>
          )}
        </div>

        {/* PERFORATION */}
        <div className="relative" aria-hidden>
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background ring-1 ring-border" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background ring-1 ring-border" />
          <div className="mx-6 border-t-2 border-dashed border-border/70" />
        </div>

        {/* QR STUB */}
        <div className="px-6 pt-6 pb-5 flex flex-col items-center">
          {ready ? (
            <div className="rounded-2xl bg-muted/40 p-4 ring-1 ring-border">
              <div className="[&_svg]:!h-[148px] [&_svg]:!w-[148px] [&>div]:!p-0 [&>div]:!border-0 [&>div]:!gap-1 [&_p]:!hidden">
                <TicketQrBlock ticket={ticket} />
              </div>
            </div>
          ) : (
            <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <p className="text-[11px] font-medium leading-tight text-muted-foreground">
                Your QR unlocks once payment is confirmed
              </p>
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            REF · {refCode}
          </p>
        </div>

        {/* ACTIONS */}
        {(actions || footer) && (
          <div className="border-t bg-muted/30 px-5 py-4 space-y-2">
            {actions && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
            {footer && (
              <div className="text-xs text-muted-foreground">{footer}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
