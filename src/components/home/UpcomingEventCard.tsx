import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { useEvents } from '@/features/events/hooks/useEvents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { isAfter } from 'date-fns';

export function UpcomingEventCard() {
  const { user } = useAuth();
  const { data: allEvents } = useEvents();
  const now = new Date();
  const nextEvent = allEvents?.filter(e => isAfter(new Date(e.start_time), now))?.[0];

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
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Next Event</span>
          </div>
          <p className="text-muted-foreground text-sm">Nothing scheduled</p>
        </CardContent>
      </Card>
    );
  }

  const eventDate = new Date(nextEvent.start_time);
  const dateLabel = isToday(eventDate) 
    ? 'Today' 
    : isTomorrow(eventDate) 
      ? 'Tomorrow' 
      : format(eventDate, 'EEE, MMM d');

  const rsvpMap: Record<string, { label: string; className: string }> = {
    going: { label: 'Going', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    maybe: { label: 'Maybe', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    not_going: { label: "Can't Go", className: 'bg-muted text-muted-foreground border-border' },
  };
  const rsvpStatus = myRsvp ? rsvpMap[myRsvp.response] : null;

  return (
    <Link to="/events">
      <Card className="border-border/60 hover:border-primary/20 transition-all cursor-pointer group active:scale-[0.98]">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Next Event</span>
            </div>
            {nextEvent.is_required && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Req</Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
            {nextEvent.title}
          </h3>
          
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{dateLabel} • {format(eventDate, 'h:mm a')}</span>
            </div>
            {nextEvent.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{nextEvent.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <Badge variant="outline" className="capitalize text-[10px]">
              {nextEvent.category}
            </Badge>
            {rsvpStatus ? (
              <Badge variant="outline" className={`text-[10px] ${rsvpStatus.className}`}>
                {rsvpStatus.label}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">RSVP →</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
