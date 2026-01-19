import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, isAfter } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';

export function UpcomingTimeline() {
  const { data: allEvents } = useEvents();
  const now = new Date();
  
  // Get next 5 upcoming events (skip the first one since it's shown in UpcomingEventCard)
  const upcomingEvents = allEvents
    ?.filter(e => isAfter(new Date(e.start_time), now))
    ?.slice(1, 6) || [];

  if (upcomingEvents.length === 0) {
    return null;
  }

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Coming Up</span>
        </div>
        <Link 
          to="/events" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="space-y-1">
        {upcomingEvents.map((event, index) => (
          <Link key={event.id} to="/events">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
              <div className="flex-shrink-0 w-16 text-xs text-muted-foreground">
                {formatEventDate(event.start_time)}
              </div>
              
              <div className="w-px h-8 bg-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rounded-full bg-primary/60" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(event.start_time), 'h:mm a')}
                  {event.is_required && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Req</Badge>
                  )}
                </div>
              </div>
              
              <Badge variant="outline" className="capitalize text-[10px] flex-shrink-0">
                {event.category}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
