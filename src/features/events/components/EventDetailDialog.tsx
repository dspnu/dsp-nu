import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/core/auth/AuthContext';
import { EventRSVP } from './EventRSVP';
import { DeleteEventButton } from './EventForm';
import { Link } from 'react-router-dom';

type Event = Tables<'events'>;

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAttendance?: () => void;
}

export function EventDetailDialog({ event, open, onOpenChange, onOpenAttendance }: EventDetailDialogProps) {
  const { canManageEvents, user } = useAuth();

  if (!event) return null;

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const isPast = startDate < new Date();
  const ticketedEventId = (event as any).ticketed_event_id as string | null | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            <CategoryBadge category={event.category} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startDate, 'h:mm a')}
              {endDate && ` - ${format(endDate, 'h:mm a')}`}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {event.points_value > 0 && (
              <Badge variant="secondary">{event.points_value} points</Badge>
            )}
            {event.is_required && (
              <Badge variant="destructive">Required</Badge>
            )}
          </div>

          {event.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {!isPast && user && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">RSVP</h4>
              <EventRSVP eventId={event.id} paymentRequired={(event as any).payment_required} />
            </div>
          )}

          {ticketedEventId && (
            <div className="pt-4 border-t">
              <Button asChild className="w-full gap-2" variant="secondary">
                <Link to={`/tickets?ticketedEventId=${encodeURIComponent(ticketedEventId)}`}>
                  View tickets
                </Link>
              </Button>
            </div>
          )}

          {canManageEvents && (
            <div className="pt-4 border-t flex flex-wrap gap-2">
              {onOpenAttendance && (
                <Button onClick={onOpenAttendance} variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Record Attendance
                </Button>
              )}
              <DeleteEventButton
                event={event}
                variant="outline"
                onDeleted={() => onOpenChange(false)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
