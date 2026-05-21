import { ReactNode } from 'react';
import { format } from 'date-fns';
import { Ticket as TicketIcon } from 'lucide-react';
import { TicketQrBlock } from './TicketQrBlock';
import { Tables } from '@/integrations/supabase/types';

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

function Field({
  label,
  value,
  onDark = false,
  className = '',
}: {
  label: string;
  value: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={`text-[10px] font-medium uppercase tracking-[0.16em] ${
          onDark ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-bold leading-tight ${
          onDark ? 'text-primary-foreground' : 'text-foreground'
        }`}
      >
        {value}
      </div>
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

  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* HEADER — purple panel */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-5 pt-4 pb-5 text-primary-foreground">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-background/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Brotherhood Pass
          </span>
          <TicketIcon className="h-4 w-4 opacity-80" />
        </div>

        <h3 className="mt-3 text-lg font-bold uppercase leading-tight tracking-tight line-clamp-2">
          {event.title}
        </h3>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/80">
          {format(start, 'EEE · MMM d, yyyy')}
        </p>
      </div>

      {/* INFO ROW */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
        <Field label="Date" value={format(start, 'MMM d')} />
        <Field label="Time" value={format(start, 'p')} />
        {event.location && (
          <Field label="Location" value={event.location} className="col-span-2" />
        )}
      </div>

      {/* PERFORATION */}
      <div className="relative" aria-hidden="true">
        <div className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background border" />
        <div className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-background border" />
        <div className="mx-4 border-t border-dashed border-border" />
      </div>

      {/* QR STUB */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {ready ? (
              <div className="rounded-md bg-background p-1.5 ring-1 ring-border">
                <div className="[&_svg]:!h-[112px] [&_svg]:!w-[112px] [&>div]:!p-0 [&>div]:!border-0 [&>div]:!gap-1 [&_p]:!hidden">
                  <TicketQrBlock ticket={ticket} />
                </div>
              </div>
            ) : (
              <div className="flex h-[124px] w-[124px] flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 p-2 text-center">
                <TicketIcon className="h-5 w-5 text-muted-foreground" />
                <p className="text-[10px] leading-tight text-muted-foreground">
                  Unlocks after payment
                </p>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <Field label="Passenger" value={passengerName ?? 'Brother'} />
            <Field label="Ticket" value={`#${ticketShort}`} />
            <Field
              label="Status"
              value={ticket.payment_status === 'paid' ? 'Paid' : 'Pending'}
            />
          </div>
        </div>

        {statusBadges && (
          <div className="mt-3 flex flex-wrap gap-1.5">{statusBadges}</div>
        )}
      </div>

      {/* ACTIONS */}
      {(actions || footer) && (
        <div className="border-t bg-muted/20 px-5 py-3">
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
          {footer && <div className={actions ? 'mt-2' : ''}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
