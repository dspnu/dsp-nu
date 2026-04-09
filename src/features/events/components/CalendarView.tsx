import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Event = Tables<'events'>;

interface CalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the beginning with empty days
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
        <h2 className="text-sm font-semibold tabular-nums sm:text-base">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border p-1 sm:p-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div
            key={`${day}-${i}`}
            className="bg-card py-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs sm:normal-case sm:tracking-normal"
            title={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}
          >
            <span className="sm:hidden">{day}</span>
            <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
          </div>
        ))}

        {paddedDays.map((day, index) => {
          if (!day) {
            return (
              <div key={`empty-${index}`} className="min-h-[52px] bg-muted/20 sm:min-h-[64px] md:min-h-[72px]" />
            );
          }

          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex min-h-[52px] flex-col bg-card p-0.5 sm:min-h-[64px] sm:p-1 md:min-h-[72px]',
                isToday && 'ring-1 ring-inset ring-primary',
                !isSameMonth(day, currentDate) && 'opacity-45'
              )}
            >
              <div
                className={cn(
                  'mx-auto mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-center text-[10px] font-medium sm:h-6 sm:w-6 sm:text-xs',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="min-h-0 flex-1 space-y-px">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick?.(event)}
                    className="w-full rounded-sm bg-primary/10 px-0.5 py-px text-left text-[9px] leading-tight text-primary hover:bg-primary/20 sm:text-[10px]"
                  >
                    <span className="line-clamp-2">{event.title}</span>
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-center text-[9px] text-muted-foreground sm:text-[10px]">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
