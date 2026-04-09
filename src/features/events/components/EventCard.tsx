import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Calendar, MapPin, Clock, Users, ExternalLink } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { EditEventButton } from './EventForm';
import { useAuth } from '@/core/auth/AuthContext';
import { generateGoogleCalendarUrl, generateOutlookUrl } from '@/lib/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Event = Tables<'events'>;

interface EventCardProps {
  event: Event;
  onOpenAttendance?: () => void;
}

export function EventCard({ event, onOpenAttendance }: EventCardProps) {
  const { isAdminOrOfficer } = useAuth();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="space-y-0 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={event.category} />
              {event.is_required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
            </div>
            <CardTitle className="text-base leading-snug sm:text-lg">{event.title}</CardTitle>
          </div>
          {isAdminOrOfficer && <EditEventButton event={event} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4 pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(new Date(event.start_time), 'h:mm a')}
            {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}
        {event.points_value > 0 && (
          <Badge variant="outline" className="text-xs">
            {event.points_value} points
          </Badge>
        )}
        
        <div className="flex flex-wrap gap-2 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Add to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <a href={generateGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                  Google Calendar
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={generateOutlookUrl(event)} target="_blank" rel="noopener noreferrer">
                  Outlook
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isAdminOrOfficer && onOpenAttendance && (
            <Button variant="outline" size="sm" className="gap-1" onClick={onOpenAttendance}>
              <Users className="h-3 w-3" />
              Attendance
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
