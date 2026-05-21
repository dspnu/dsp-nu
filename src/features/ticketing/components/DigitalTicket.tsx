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
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* HEADER — blue panel with title */}
      <div className="bg-gradient-to-br from-primary to-primary/85 px-6 pt-6 pb-7 text-primary-foreground">
        <div className="flex justify-center">
          <span className="rounded-full bg-background/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Brotherhood Pass
          </span>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-primary-foreground/90">
          <div className="h-px w-10 bg-primary-foreground/40" />
          <TicketIcon className="h-5 w-5" />
          <div className="h-px w-10 bg-primary-foreground/40" />
        </div>

        <h3 className="mt-5 text-center text-2xl font-extrabold uppercase leading-tight tracking-tight">
          {event.title}
        </h3>
        <p className="mt-1 text-center text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80">
          {format(start, 'EEE · MMM d, yyyy')}
        </p>
      </div>

      {/* INFO ROW */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5">
        <Field label="Date" value={format(start, 'MMM d, yyyy')} />
        <Field label="Time" value={format(start, 'p')} />
        {event.location && (
          <Field label="Location" value={event.location} className="col-span-2" />
        )}
        <Field label="Ticket" value={`#${ticketShort}`} />
        <Field label="Status" value={ticket.payment_status === 'paid' ? 'Paid' : 'Pending'} />
      </div>

      {/* PERFORATION with side cutouts */}
      <div className="relative" aria-hidden="true">
        <div className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background border" />
        <div className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-background border" />
        <div className="mx-5 border-t-2 border-dashed border-border" />
      </div>

      {/* QR STUB */}
      <div className="px-6 py-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Show this QR code at check-in
        </p>

        <div className="mt-4 flex justify-center">
          {ready ? (
            <div className="rounded-lg bg-background p-3 ring-1 ring-border">
              <TicketQrBlock ticket={ticket} />
            </div>
          ) : (
            <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <TicketIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                QR unlocks after payment is confirmed
              </p>
            </div>
          )}
        </div>

        {statusBadges && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {statusBadges}
          </div>
        )}
      </div>

      {/* FOOTER — passenger strip */}
      <div className="bg-gradient-to-br from-primary to-primary/85 px-6 py-4 text-primary-foreground">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Passenger"
            value={passengerName ?? 'Brother'}
            onDark
          />
          <Field
            label="Ticket ID"
            value={`#${ticketShort}`}
            onDark
            className="text-right [&>div]:text-right"
          />
        </div>
      </div>

      {/* ACTIONS */}
      {(actions || footer) && (
        <div className="border-t bg-muted/20 px-6 py-4">
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
          {footer && <div className={actions ? 'mt-3' : ''}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
