import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Ticket, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTicketedEvents } from '@/features/ticketing/hooks/useTicketedEvents';

export function TicketsHomeCard() {
  const { data: events, isLoading } = useTicketedEvents();

  if (isLoading) return null;
  if (!events?.length) return null;

  const next = [...events]
    .filter((e) => new Date(e.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  return (
    <Link to="/tickets" className="block">
      <Card
        className={cn(
          'overflow-hidden border transition-all hover:shadow-md active:scale-[0.99]',
          'border-primary/15 bg-gradient-to-br from-primary/[0.10] via-card to-card'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Tickets</p>
                  <p className="text-xs text-muted-foreground">
                    {events.length} ticketed event{events.length !== 1 ? 's' : ''} available.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              {next && (
                <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <p className="text-xs font-medium text-foreground truncate">{next.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Next up: {format(new Date(next.starts_at), 'EEE, MMM d · h:mm a')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

