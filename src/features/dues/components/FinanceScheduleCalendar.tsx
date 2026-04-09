import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FinanceScheduleItem {
  id: string;
  title: string;
  /** Calendar day (date-only semantics) */
  date: string;
  variant: 'installment' | 'late_fee';
  detail?: string;
}

const VARIANT_CLASS: Record<FinanceScheduleItem['variant'], string> = {
  installment:
    'border-sky-500/35 bg-sky-500/10 text-sky-800 hover:bg-sky-500/16 dark:text-sky-100',
  late_fee:
    'border-amber-500/40 bg-amber-500/12 text-amber-900 hover:bg-amber-500/18 dark:text-amber-100',
};

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

interface FinanceScheduleCalendarProps {
  items: FinanceScheduleItem[];
  /** Optional: highlight a specific item id */
  highlightId?: string | null;
}

export function FinanceScheduleCalendar({ items, highlightId }: FinanceScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  const startDay = monthStart.getDay();
  const paddedDays: (Date | null)[] = Array(startDay).fill(null).concat(days);

  const getItemsForDay = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    return items.filter((item) => item.date.slice(0, 10) === key);
  };

  return (
    <Card className="overflow-hidden border-border/80 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 bg-gradient-to-r from-primary/[0.07] via-card to-secondary/[0.08] px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums sm:text-xl">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Installment due dates and late-fee deadlines
          </p>
        </div>
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

      <div className="flex flex-wrap gap-4 border-b border-border/50 bg-muted/20 px-4 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Installment due
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Late fee deadline
        </span>
      </div>

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

            const dayItems = getItemsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex min-h-[56px] flex-col rounded-lg border p-1.5 shadow-sm transition-colors sm:min-h-[68px] sm:p-2 md:min-h-[76px]',
                  'border-border/50 bg-card/90 backdrop-blur-[2px]',
                  isWeekendCol && 'bg-muted/15',
                  isToday &&
                    'border-primary/45 bg-gradient-to-b from-primary/[0.12] to-card ring-1 ring-primary/25'
                )}
              >
                <div className="mb-1 flex shrink-0 justify-start tabular-nums">
                  <span
                    className={cn(
                      'inline-flex min-h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-md px-1 text-xs font-semibold text-muted-foreground sm:text-sm',
                      isToday && 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1">
                  {dayItems.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      title={item.detail ? `${item.title} — ${item.detail}` : item.title}
                      className={cn(
                        'w-full rounded-md border px-1 py-0.5 text-left text-[9px] font-medium leading-snug shadow-sm sm:text-[10px]',
                        VARIANT_CLASS[item.variant],
                        highlightId === item.id && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                      )}
                    >
                      <span className="line-clamp-2">{item.title}</span>
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <div className="text-center">
                      <span className="inline-flex rounded-full bg-muted/80 px-1.5 py-px text-[9px] font-medium tabular-nums text-muted-foreground sm:text-[10px]">
                        +{dayItems.length - 2} more
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
