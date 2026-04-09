import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Event = Tables<'events'>;

interface CalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

/** Compact chip styles aligned with CategoryBadge / org theme */
function categoryEventChipClass(category: string): string {
  const styles: Record<string, string> = {
    chapter:
      'border-category-chapter/35 bg-category-chapter/12 text-category-chapter hover:bg-category-chapter/20',
    rush: 'border-category-rush/35 bg-category-rush/12 text-category-rush hover:bg-category-rush/20',
    fundraising:
      'border-category-fundraising/35 bg-category-fundraising/12 text-category-fundraising hover:bg-category-fundraising/20',
    service:
      'border-category-service/35 bg-category-service/12 text-category-service hover:bg-category-service/20',
    brotherhood:
      'border-category-brotherhood/35 bg-category-brotherhood/12 text-category-brotherhood hover:bg-category-brotherhood/20',
    professionalism:
      'border-category-professionalism/35 bg-category-professionalism/12 text-category-professionalism hover:bg-category-professionalism/20',
    dei: 'border-category-dei/35 bg-category-dei/12 text-category-dei hover:bg-category-dei/20',
    new_member: 'border-purple-500/30 bg-purple-500/12 text-purple-800 hover:bg-purple-500/18 dark:text-purple-200',
    exec: 'border-slate-400/35 bg-slate-500/12 text-slate-700 hover:bg-slate-500/18 dark:text-slate-200',
  };
  return (
    styles[category] ?? 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/18'
  );
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });

  const startDay = monthStart.getDay();
  const paddedDays: (Date | null)[] = Array(startDay).fill(null).concat(days);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.start_time), day));
  };

  return (
    <Card className="overflow-hidden border-border/80 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 bg-gradient-to-r from-primary/[0.07] via-card to-secondary/[0.08] px-4 py-3.5 sm:px-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums sm:text-xl">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-border/80 bg-card/80 shadow-sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border/80 bg-card/80 px-3 text-xs font-medium shadow-sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-border/80 bg-card/80 shadow-sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="bg-muted/25 p-2.5 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAY_SHORT.map((label, i) => (
            <div
              key={label}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs sm:normal-case sm:tracking-normal"
              title={WEEKDAY_FULL[i]}
            >
              <span className="sm:hidden">{WEEKDAY_LETTER[i]}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}

          {paddedDays.map((day, index) => {
            const col = index % 7;
            const isWeekendCol = col === 0 || col === 6;

            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className={cn(
                    'min-h-[56px] rounded-lg border border-transparent bg-muted/20 sm:min-h-[68px] md:min-h-[76px]',
                    isWeekendCol && 'bg-muted/35'
                  )}
                />
              );
            }

            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex min-h-[56px] flex-col rounded-lg border p-1.5 shadow-sm transition-colors sm:min-h-[68px] sm:p-2 md:min-h-[76px]',
                  'border-border/50 bg-card/90 backdrop-blur-[2px]',
                  isWeekendCol && 'bg-muted/15',
                  isToday &&
                    'border-primary/45 bg-gradient-to-b from-primary/[0.12] to-card ring-1 ring-primary/25',
                  !isSameMonth(day, currentDate) && 'opacity-50'
                )}
              >
                <div className="mb-1 flex shrink-0 justify-start tabular-nums">
                  <span
                    className={cn(
                      'inline-flex min-h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-md px-1 text-xs font-semibold text-muted-foreground sm:text-sm',
                      isToday &&
                        'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        'w-full rounded-md border px-1 py-0.5 text-left text-[9px] font-medium leading-snug shadow-sm transition-colors sm:text-[10px]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        categoryEventChipClass(event.category)
                      )}
                    >
                      <span className="line-clamp-2">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-center">
                      <span className="inline-flex rounded-full bg-muted/80 px-1.5 py-px text-[9px] font-medium tabular-nums text-muted-foreground sm:text-[10px]">
                        +{dayEvents.length - 2} more
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
