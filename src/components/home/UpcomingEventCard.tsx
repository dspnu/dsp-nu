import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAfter } from 'date-fns';

export function UpcomingEventCard() {
  const { user } = useAuth();
  const { data: allEvents } = useEvents();
  const now = new Date();
  
  // Get next upcoming event
  const nextEvent = allEvents?.filter(e => isAfter(new Date(e.start_time), now))?.[0];
  
  // Fetch user's RSVP for this event
  const { data: myRsvp } = useQuery({
    queryKey: ['my-rsvp', nextEvent?.id, user?.id],
    queryFn: async () => {
      if (!nextEvent?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('response')
        .eq('event_id', nextEvent.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!nextEvent?.id && !!user?.id,
  });

  if (!nextEvent) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Next Event</span>
          </div>
          <p className="text-muted-foreground text-sm">No upcoming events scheduled</p>
        </CardContent>
      </Card>
    );
  }

  const eventDate = new Date(nextEvent.start_time);
  const dateLabel = isToday(eventDate) 
    ? 'Today' 
    : isTomorrow(eventDate) 
      ? 'Tomorrow' 
      : format(eventDate, 'EEEE, MMM d');

  const getRsvpStatus = () => {
    if (!myRsvp) return null;
    const statusMap: Record<string, { label: string; className: string }> = {
      going: { label: 'Going', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      maybe: { label: 'Maybe', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      not_going: { label: "Can't Go", className: 'bg-muted text-muted-foreground border-border' },
    };
    return statusMap[myRsvp.response];
  };

  const rsvpStatus = getRsvpStatus();

  return (
    <Link to="/events">
      <Card className="border-border/60 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Next Event</span>
            </div>
            {nextEvent.is_required && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">Required</Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {nextEvent.title}
          </h3>
          
          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{dateLabel} at {format(eventDate, 'h:mm a')}</span>
            </div>
            {nextEvent.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{nextEvent.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize text-xs">
              {nextEvent.category}
            </Badge>
            {rsvpStatus ? (
              <Badge variant="outline" className={rsvpStatus.className}>
                {rsvpStatus.label}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">RSVP →</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
