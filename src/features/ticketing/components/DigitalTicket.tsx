import { ReactNode } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
}

export function DigitalTicket({
  ticket,
  event,
  ready,
  statusBadges,
  actions,
  footer,
}: DigitalTicketProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Ticket body — stub layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto]">
        {/* Main panel */}
        <div className="relative bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80">
            <TicketIcon className="h-3.5 w-3.5" />
            Brotherhood Ticket
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-tight sm:text-2xl">
            {event.title}
          </h3>

          <div className="mt-4 space-y-2 text-sm text-primary-foreground/90">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
              <span>{format(new Date(event.starts_at), 'EEE, MMM d · p')}</span>
            </div>
            {event.location && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                <span className="break-words">{event.location}</span>
              </div>
            )}
          </div>

          {statusBadges && (
            <div className="mt-4 flex flex-wrap gap-1.5">{statusBadges}</div>
          )}
        </div>

        {/* Perforation */}
        <div className="relative hidden md:block" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-border" />
          <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute left-1/2 bottom-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-background" />
          <div className="w-0 md:w-px" />
        </div>
        <div className="relative md:hidden" aria-hidden="true">
          <div className="border-t-2 border-dashed border-border" />
          <div className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
        </div>

        {/* Stub — QR */}
        <div className="flex flex-col items-center justify-center gap-2 bg-muted/30 p-5 sm:p-6">
          {ready ? (
            <TicketQrBlock ticket={ticket} />
          ) : (
            <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-4 text-center">
              <TicketIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                QR unlocks after payment is confirmed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions / footer */}
      {(actions || footer) && (
        <div className="border-t bg-muted/20 px-5 py-4 sm:px-6">
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          {footer && <div className={actions ? 'mt-3' : ''}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
