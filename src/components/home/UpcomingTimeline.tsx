import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, isAfter } from 'date-fns';
import { useEvents } from '@/features/events/hooks/useEvents';

export function UpcomingTimeline() {
  const { data: allEvents } = useEvents();
  const now = new Date();
  
  const upcomingEvents = allEvents
    ?.filter(e => isAfter(new Date(e.start_time), now))
    ?.slice(1, 6) || [];

  if (upcomingEvents.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">Coming Up</span>
        </div>
        <Link 
          to="/events" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="space-y-0.5">
        {upcomingEvents.map((event) => (
          <Link key={event.id} to="/events">
            <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 active:bg-muted/60 transition-colors group">
              <div className="w-14 text-[11px] text-muted-foreground shrink-0 tabular-nums">
                {formatDate(event.start_time)}
              </div>
              
              <div className="w-px h-6 bg-border/60 relative">
                <div className="absolute top-1/2 -translate-y-1/2 -left-[3px] w-[7px] h-[7px] rounded-full bg-primary/50" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {event.title}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {format(new Date(event.start_time), 'h:mm a')}
                  {event.is_required && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">Req</Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
