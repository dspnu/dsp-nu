import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  HOUR_PX,
  type CalendarMode,
  coversDay,
  eventRange,
  isAllDayEvent,
  layoutAllDay,
  layoutTimedEvents,
  visibleHourRange,
} from './calendarLayout';

type Event = Tables<'events'>;

interface CalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const MODES: { id: CalendarMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function eventBlockClass(category: string): string {
  const styles: Record<string, string> = {
    chapter: 'bg-category-chapter text-primary-foreground',
    rush: 'bg-category-rush text-secondary-foreground',
    fundraising: 'bg-category-fundraising text-white',
    service: 'bg-category-service text-white',
    brotherhood: 'bg-category-brotherhood text-white',
    professionalism: 'bg-category-professionalism text-secondary-foreground',
    dei: 'bg-category-dei text-secondary-foreground',
    new_member: 'bg-purple-600 text-white',
    exec: 'bg-slate-600 text-white dark:bg-slate-500',
  };
  return styles[category] ?? 'bg-primary text-primary-foreground';
}

function eventLabel(event: Event): string {
  const range = eventRange(event);
  const when = range
    ? `${format(range.start, 'EEE, MMM d, h:mm a')} – ${format(range.end, 'h:mm a')}`
    : '';
  return [event.title, when, event.location].filter(Boolean).join(', ');
}

function formatViewTitle(mode: CalendarMode, anchor: Date): string {
  if (mode === 'day') return format(anchor, 'EEE, d MMM yyyy');
  if (mode === 'month') return format(anchor, 'MMMM yyyy');
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  const end = endOfWeek(anchor, { weekStartsOn: 0 });
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

function shiftAnchor(mode: CalendarMode, anchor: Date, direction: 1 | -1): Date {
  if (mode === 'day') return addDays(anchor, direction);
  if (mode === 'week') return addWeeks(anchor, direction);
  return addMonths(anchor, direction);
}

function EventBlockBody({ event, height }: { event: Event; height: number }) {
  const range = eventRange(event);
  const time = range ? `${format(range.start, 'h:mm a')} – ${format(range.end, 'h:mm a')}` : '';
  return (
    <>
      <p className="truncate font-semibold leading-4">{event.title}</p>
      {height >= 46 && time && <p className="truncate text-[10px] leading-tight opacity-90">{time}</p>}
      {height >= 66 && event.location && (
        <p className="truncate text-[10px] leading-tight opacity-80">{event.location}</p>
      )}
    </>
  );
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [miniMonth, setMiniMonth] = useState(() => startOfMonth(new Date()));
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMiniMonth(startOfMonth(anchor));
  }, [anchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: endOfWeek(anchor, { weekStartsOn: 0 }) });
  }, [anchor]);

  const visibleDays = useMemo(
    () => (mode === 'day' ? [anchor] : weekDays),
    [mode, anchor, weekDays],
  );

  const hours = useMemo(() => {
    const { startHour, endHour } = visibleHourRange(events, visibleDays);
    return { startHour, endHour, slots: Array.from({ length: endHour - startHour }, (_, i) => startHour + i) };
  }, [events, visibleDays]);

  const allDay = useMemo(() => layoutAllDay(events, visibleDays), [events, visibleDays]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const day of monthDays) {
      const key = format(day, 'yyyy-MM-dd');
      const matches = events
        .filter((event) => coversDay(event, day))
        .sort((a, b) => {
          const allDayDelta = Number(isAllDayEvent(b)) - Number(isAllDayEvent(a));
          if (allDayDelta !== 0) return allDayDelta;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        });
      map.set(key, matches);
    }
    return map;
  }, [events, monthDays]);

  const scrolledMode = useRef<CalendarMode | null>(null);

  useEffect(() => {
    if (mode === 'month') return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const frame = requestAnimationFrame(() => {
      if (scrolledMode.current !== mode) {
        const now = new Date();
        const showingToday = visibleDays.some((day) => isSameDay(day, now));
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        scroller.scrollTop = showingToday
          ? Math.max(0, (nowMinutes / 60 - hours.startHour) * HOUR_PX - 96)
          : Math.max(0, (8 - hours.startHour) * HOUR_PX);
        scrolledMode.current = mode;
      }

      if (mode === 'week' && window.matchMedia('(max-width: 767px)').matches) {
        const selected = scroller.querySelector<HTMLElement>(
          `[data-day="${format(anchor, 'yyyy-MM-dd')}"]`,
        );
        selected?.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, mode, hours.startHour, visibleDays]);

  const rangeHasEvents = visibleDays.some((day) => events.some((event) => coversDay(event, day)));

  const openDay = (day: Date) => {
    setAnchor(day);
    setMode('day');
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <MiniMonth
        className="hidden xl:block"
        month={miniMonth}
        anchor={anchor}
        events={events}
        onMonthChange={setMiniMonth}
        onSelectDay={setAnchor}
      />

      <section
        aria-label="Event calendar"
        className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
          <div className="flex w-full items-center justify-center gap-0.5 sm:w-auto sm:justify-start">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setAnchor((current) => shiftAnchor(mode, current, -1))}
              aria-label={mode === 'day' ? 'Previous day' : mode === 'week' ? 'Previous week' : 'Previous month'}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setAnchor((current) => shiftAnchor(mode, current, 1))}
              aria-label={mode === 'day' ? 'Next day' : mode === 'week' ? 'Next week' : 'Next month'}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <h2 className="min-w-0 truncate px-1 font-display text-base font-semibold tracking-tight sm:text-lg" aria-live="polite">
              {formatViewTitle(mode, anchor)}
            </h2>
          </div>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 rounded-full px-3.5 text-sm"
              onClick={() => setAnchor(new Date())}
            >
              Today
            </Button>
            <div className="grid flex-1 grid-cols-3 rounded-full bg-muted/80 p-1 sm:flex sm:flex-none" role="tablist" aria-label="Calendar layout">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === item.id}
                  onClick={() => setMode(item.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === item.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode !== 'month' && (
          <div className="border-b border-border/70 px-2 py-2 md:hidden">
            <div className="grid grid-cols-7">
              {weekDays.map((day) => {
                const selected = isSameDay(day, anchor);
                const today = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setAnchor(day)}
                    className="flex flex-col items-center gap-1 py-1"
                    aria-label={format(day, 'EEEE, MMMM d')}
                    aria-pressed={selected}
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">{format(day, 'EEEEE')}</span>
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                        selected && 'bg-primary text-primary-foreground',
                        !selected && today && 'text-primary',
                        !selected && !today && 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'month' ? (
          <MonthGrid
            days={monthDays}
            anchor={anchor}
            eventsByDay={eventsByDay}
            onSelectDay={openDay}
            onEventClick={onEventClick}
          />
        ) : (
          <>
            {!rangeHasEvents && (
              <p className="border-b border-border/60 px-4 py-2 text-center text-xs text-muted-foreground">
                Nothing scheduled in this range. Use the arrows to check another {mode}.
              </p>
            )}
            <TimeGrid
              scrollerRef={scrollerRef}
              days={visibleDays}
              anchor={anchor}
              events={events}
              startHour={hours.startHour}
              slots={hours.slots}
              allDay={allDay}
              onSelectDay={openDay}
              onEventClick={onEventClick}
            />
          </>
        )}
      </section>
    </div>
  );
}

function MiniMonth({
  month,
  anchor,
  events,
  onMonthChange,
  onSelectDay,
  className,
}: {
  month: Date;
  anchor: Date;
  events: Event[];
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: Date) => void;
  className?: string;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  const years = useMemo(() => {
    const set = new Set<number>([month.getFullYear(), anchor.getFullYear(), new Date().getFullYear()]);
    for (const event of events) {
      const time = new Date(event.start_time);
      if (!Number.isNaN(time.getTime())) set.add(time.getFullYear());
    }
    const min = Math.min(...set) - 1;
    const max = Math.max(...set) + 1;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [anchor, events, month]);

  return (
    <aside className={cn('w-[248px] shrink-0 rounded-2xl border border-border/80 bg-card p-3 shadow-sm', className)}>
      <div className="flex gap-2">
        <select
          aria-label="Month"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm font-medium"
          value={month.getMonth()}
          onChange={(event) => onMonthChange(new Date(month.getFullYear(), Number(event.target.value), 1))}
        >
          {Array.from({ length: 12 }, (_, monthIndex) => (
            <option key={monthIndex} value={monthIndex}>
              {format(new Date(2026, monthIndex, 1), 'MMMM')}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          className="h-9 w-[88px] rounded-lg border border-border bg-background px-2 text-sm font-medium"
          value={month.getFullYear()}
          onChange={(event) => onMonthChange(new Date(Number(event.target.value), month.getMonth(), 1))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Previous month"
          onClick={() => onMonthChange(subMonths(month, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Next month"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <div key={`${letter}-${index}`} className="py-1 text-[11px] font-medium text-muted-foreground">
            {letter}
          </div>
        ))}
        {days.map((day) => {
          const selected = isSameDay(day, anchor);
          const today = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, month);
          const hasEvents = events.some((event) => coversDay(event, day));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-current={today ? 'date' : undefined}
              aria-pressed={selected}
              className={cn(
                'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums',
                selected && 'bg-primary text-primary-foreground',
                !selected && today && 'text-primary font-semibold',
                !selected && !today && inMonth && 'text-foreground hover:bg-accent',
                !inMonth && !selected && 'text-muted-foreground/45'
              )}
            >
              {format(day, 'd')}
              {hasEvents && !selected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function MonthGrid({
  days,
  anchor,
  eventsByDay,
  onSelectDay,
  onEventClick,
}: {
  days: Date[];
  anchor: Date;
  eventsByDay: Map<string, Event[]>;
  onSelectDay: (day: Date) => void;
  onEventClick?: (event: Event) => void;
}) {
  return (
    <div className="p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <div key={`${letter}-${index}`} className="pb-1 text-center text-[11px] font-semibold text-muted-foreground">
            <span className="sm:hidden">{letter}</span>
            <span className="hidden sm:inline">{format(days[index] ?? new Date(), 'EEE')}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const visible = dayEvents.slice(0, 3);
          const hidden = dayEvents.length - visible.length;
          const today = isSameDay(day, new Date());
          const selected = isSameDay(day, anchor);
          return (
            <div
              key={key}
              className={cn(
                'flex min-h-[76px] flex-col rounded-lg border border-border/50 bg-background p-1 sm:min-h-[108px] sm:p-1.5',
                !isSameMonth(day, anchor) && 'bg-muted/30'
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'mb-1 inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold tabular-nums',
                  selected && 'bg-primary text-primary-foreground',
                  !selected && today && 'text-primary ring-2 ring-primary',
                  !selected && !today && isSameMonth(day, anchor) && 'text-foreground hover:bg-accent',
                  !selected && !today && !isSameMonth(day, anchor) && 'text-muted-foreground/50 hover:bg-accent'
                )}
                aria-label={`Open ${format(day, 'EEEE, MMMM d')}`}
              >
                {format(day, 'd')}
              </button>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    title={eventLabel(event)}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight sm:text-[11px]',
                      eventBlockClass(event.category)
                    )}
                  >
                    {event.title}
                  </button>
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="text-left text-[10px] font-medium text-primary"
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  scrollerRef,
  days,
  anchor,
  events,
  startHour,
  slots,
  allDay,
  onSelectDay,
  onEventClick,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
  days: Date[];
  anchor: Date;
  events: Event[];
  startHour: number;
  slots: number[];
  allDay: ReturnType<typeof layoutAllDay<Event>>;
  onSelectDay: (day: Date) => void;
  onEventClick?: (event: Event) => void;
}) {
  const now = new Date();
  const columnClass = days.length === 1 ? 'grid-cols-1' : 'grid-cols-7';

  return (
    <div
      ref={scrollerRef}
      className="max-h-[min(680px,calc(100dvh-18rem))] overflow-auto overscroll-contain md:max-h-[min(760px,calc(100dvh-14rem))]"
    >
      <div data-calendar-track className={cn(days.length > 1 && 'min-w-[760px] md:min-w-0')}>
        <div className="sticky top-0 z-30 border-b border-border/70 bg-card">
          <div className="flex">
            <div className="sticky left-0 z-40 w-14 shrink-0 border-r border-border/70 bg-card" />
            <div className={cn('grid flex-1', columnClass)}>
              {days.map((day) => {
                const selected = isSameDay(day, anchor);
                const today = isSameDay(day, now);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    data-day={format(day, 'yyyy-MM-dd')}
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      'border-l border-border/60 px-2 py-2 text-left first:border-l-0',
                      selected && 'bg-primary/[0.05]'
                    )}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={cn(
                        'mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-lg font-semibold tabular-nums',
                        selected && 'bg-primary text-primary-foreground',
                        !selected && today && 'text-primary',
                        !selected && !today && 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {allDay.laneCount > 0 && (
            <div className="flex max-h-36 overflow-y-auto border-t border-border/70">
              <div className="sticky left-0 z-40 w-14 shrink-0 border-r border-border/70 bg-card" />
              <div className="relative flex-1" style={{ height: allDay.laneCount * 30 + 8 }}>
                {allDay.blocks.map((block) => (
                  <button
                    key={block.event.id}
                    type="button"
                    title={eventLabel(block.event)}
                    aria-label={eventLabel(block.event)}
                    onClick={() => onEventClick?.(block.event)}
                    className={cn(
                      'absolute flex items-center truncate rounded-md px-2 text-left text-xs font-semibold shadow-sm hover:brightness-95',
                      eventBlockClass(block.event.category)
                    )}
                    style={{
                      top: 4 + block.lane * 30,
                      height: 26,
                      left: `calc(${(block.startCol / days.length) * 100}% + 3px)`,
                      width: `calc(${((block.endCol - block.startCol + 1) / days.length) * 100}% - 6px)`,
                    }}
                  >
                    {block.event.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex">
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-border/70 bg-card">
            {slots.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_PX }}>
                <span className="absolute right-2 top-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {format(new Date(2026, 0, 1, hour), 'h a')}
                </span>
              </div>
            ))}
          </div>
          <div className={cn('grid flex-1', columnClass)}>
            {days.map((day) => {
              const blocks = layoutTimedEvents(events, day, startHour, startHour + slots.length);
              const selected = isSameDay(day, anchor);
              const showNow = isSameDay(day, now);
              const nowTop =
                ((now.getHours() * 60 + now.getMinutes()) / 60 - startHour) * HOUR_PX;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative border-l border-border/60 first:border-l-0',
                    selected && 'bg-primary/[0.04]'
                  )}
                >
                  {slots.map((hour) => (
                    <div key={hour} className="border-b border-border/70" style={{ height: HOUR_PX }}>
                      <div className="h-1/2 border-b border-border/40" />
                    </div>
                  ))}
                  {showNow && nowTop >= 0 && nowTop <= slots.length * HOUR_PX && (
                    <div className="pointer-events-none absolute inset-x-1.5 z-20" style={{ top: nowTop }}>
                      <div className="relative border-t-2 border-primary">
                        <span className="absolute left-0 -top-[5px] h-2.5 w-2.5 rounded-full bg-primary" />
                      </div>
                    </div>
                  )}
                  {blocks.map((block) => (
                    <button
                      key={block.event.id}
                      type="button"
                      title={eventLabel(block.event)}
                      aria-label={eventLabel(block.event)}
                      onClick={() => onEventClick?.(block.event)}
                      className={cn(
                        'absolute z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:text-xs',
                        eventBlockClass(block.event.category)
                      )}
                      style={{
                        top: block.top + 1,
                        height: Math.max(block.height - 3, 24),
                        left: `calc(${(block.column / block.columnCount) * 100}% + 2px)`,
                        width: `calc(${100 / block.columnCount}% - 4px)`,
                      }}
                    >
                      <EventBlockBody event={block.event} height={block.height} />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
