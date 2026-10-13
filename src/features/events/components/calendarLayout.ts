import {
  addDays,
  addHours,
  addMinutes,
  differenceInMinutes,
  startOfDay,
} from 'date-fns';

export const HOUR_PX = 64;

export type CalendarEventLike = {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location?: string | null;
  category: string;
};

export type CalendarMode = 'day' | 'week' | 'month';

export function eventRange(event: CalendarEventLike): { start: Date; end: Date } | null {
  const start = new Date(event.start_time);
  if (Number.isNaN(start.getTime())) return null;
  const parsedEnd = event.end_time ? new Date(event.end_time) : null;
  const end =
    parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start
      ? parsedEnd
      : addMinutes(start, 60);
  return { start, end };
}

/** Overnight events stay on the time grid. Multi-day trips and midnight spans sit in the all-day band. */
export function isAllDayEvent(event: CalendarEventLike): boolean {
  const range = eventRange(event);
  if (!range) return false;
  const minutes = differenceInMinutes(range.end, range.start);
  const startsMidnight = range.start.getHours() === 0 && range.start.getMinutes() === 0;
  const endsOnBoundary =
    (range.end.getHours() === 23 && range.end.getMinutes() >= 59) ||
    (range.end.getHours() === 0 && range.end.getMinutes() === 0);
  if (startsMidnight && endsOnBoundary && minutes >= 8 * 60) return true;

  const startDay = startOfDay(range.start).getTime();
  const endDay = startOfDay(addMinutes(range.end, -1)).getTime();
  const daySpan = Math.round((endDay - startDay) / 86_400_000) + 1;
  return daySpan >= 3 || minutes >= 24 * 60;
}

export function coversDay(event: CalendarEventLike, day: Date): boolean {
  const range = eventRange(event);
  if (!range) return false;
  const dayStart = startOfDay(day).getTime();
  const nextDay = addDays(startOfDay(day), 1).getTime();
  return range.start.getTime() < nextDay && range.end.getTime() > dayStart;
}

export function visibleHourRange(
  events: CalendarEventLike[],
  days: Date[],
): { startHour: number; endHour: number } {
  let startHour = 8;
  let endHour = 21;

  for (const day of days) {
    const dayStart = startOfDay(day).getTime();
    const nextDay = addDays(startOfDay(day), 1).getTime();
    for (const event of events) {
      if (isAllDayEvent(event)) continue;
      const range = eventRange(event);
      if (!range || !coversDay(event, day)) continue;
      const clippedStart = Math.max(range.start.getTime(), dayStart);
      const clippedEnd = Math.min(range.end.getTime(), nextDay);
      const startDate = new Date(clippedStart);
      const endDate = new Date(clippedEnd);
      startHour = Math.min(startHour, startDate.getHours());
      const endsOnHour = endDate.getMinutes() === 0 && endDate.getSeconds() === 0;
      const endH = endsOnHour ? endDate.getHours() : endDate.getHours() + 1;
      endHour = Math.max(endHour, endH === 0 ? 24 : endH);
    }
  }

  startHour = Math.max(0, Math.min(startHour, 18));
  endHour = Math.min(24, Math.max(endHour, startHour + 8));
  return { startHour, endHour };
}

export type TimedBlock<T extends CalendarEventLike> = {
  event: T;
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

export function layoutTimedEvents<T extends CalendarEventLike>(
  events: T[],
  day: Date,
  startHour: number,
  endHour: number,
  hourPx = HOUR_PX,
): TimedBlock<T>[] {
  const windowStart = addHours(startOfDay(day), startHour).getTime();
  const windowEnd = addHours(startOfDay(day), endHour).getTime();

  type Item = { event: T; start: number; end: number };
  const items: Item[] = [];

  for (const event of events) {
    if (isAllDayEvent(event)) continue;
    const range = eventRange(event);
    if (!range || !coversDay(event, day)) continue;
    const start = Math.max(range.start.getTime(), windowStart);
    const end = Math.min(range.end.getTime(), windowEnd);
    if (end <= start) continue;
    items.push({ event, start, end });
  }

  items.sort((a, b) => a.start - b.start || b.end - a.end);

  const clusters: Item[][] = [];
  let cluster: Item[] = [];
  let clusterEnd = -Infinity;
  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      clusters.push(cluster);
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) clusters.push(cluster);

  const blocks: TimedBlock<T>[] = [];
  for (const group of clusters) {
    const columnEnds: number[] = [];
    const assigned: { item: Item; column: number }[] = [];
    for (const item of group) {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      assigned.push({ item, column });
    }
    const columnCount = Math.max(columnEnds.length, 1);
    for (const { item, column } of assigned) {
      const top = ((item.start - windowStart) / 3_600_000) * hourPx;
      const height = Math.max(((item.end - item.start) / 3_600_000) * hourPx, 26);
      blocks.push({ event: item.event, top, height, column, columnCount });
    }
  }

  return blocks;
}

export type AllDayBlock<T extends CalendarEventLike> = {
  event: T;
  startCol: number;
  endCol: number;
  lane: number;
};

export function layoutAllDay<T extends CalendarEventLike>(
  events: T[],
  days: Date[],
): { blocks: AllDayBlock<T>[]; laneCount: number } {
  const spans = events
    .filter((event) => isAllDayEvent(event))
    .map((event) => {
      let startCol = -1;
      let endCol = -1;
      days.forEach((day, index) => {
        if (!coversDay(event, day)) return;
        if (startCol === -1) startCol = index;
        endCol = index;
      });
      return { event, startCol, endCol };
    })
    .filter((item) => item.startCol !== -1)
    .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);

  const laneEnds: number[] = [];
  const blocks: AllDayBlock<T>[] = [];
  for (const item of spans) {
    let lane = laneEnds.findIndex((end) => end < item.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endCol);
    } else {
      laneEnds[lane] = item.endCol;
    }
    blocks.push({ ...item, lane });
  }

  return { blocks, laneCount: laneEnds.length };
}
