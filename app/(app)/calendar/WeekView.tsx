'use client';

import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/types';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (date: Date) => void;
}

export function WeekView({ date, events, calendars, onSelectEvent, onSelectSlot }: WeekViewProps) {
  const ws = startOfWeek(date, { weekStartsOn: 1 });
  const we = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: ws, end: we });

  function eventsForDay(day: Date): CalendarEvent[] {
    return events.filter((ev) => {
      const start = new Date(ev.start_time);
      return isSameDay(start, day);
    });
  }

  function eventStyle(ev: CalendarEvent) {
    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);
    const startMins = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
    const endMins = end.getHours() * 60 + end.getMinutes() - START_HOUR * 60;
    const top = Math.max(0, (startMins / 60) * HOUR_HEIGHT);
    const height = Math.max(20, ((endMins - startMins) / 60) * HOUR_HEIGHT);
    const cal = calendars.find((c) => c.id === ev.calendar_id);
    return { top, height, bg: ev.color || cal?.color || '#3b82f6' };
  }

  return (
    <div className="flex rounded-lg border">
      <div className="w-16 flex-shrink-0 border-r">
        <div className="h-8 border-b" />
        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
          <div key={i} className="flex h-[60px] items-start justify-center border-b pt-1">
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(2024, 0, 1, START_HOUR + i), 'HH:mm')}
            </span>
          </div>
        ))}
      </div>

      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        const today = isToday(day);

        return (
          <div key={day.toISOString()} className="relative flex-1 border-r last:border-r-0">
            <div
              className={cn(
                'sticky top-0 z-10 flex items-center justify-center border-b py-2',
                today && 'bg-blue-50/50 dark:bg-blue-950/30'
              )}
            >
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    today && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            </div>

            <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b border-dashed border-border/50"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT / 2 }}
                  onClick={() => onSelectSlot(new Date(day.getFullYear(), day.getMonth(), day.getDate(), START_HOUR + i))}
                >
                  <div
                    className="h-full cursor-pointer hover:bg-accent/30"
                    onClick={() => onSelectSlot(new Date(day.getFullYear(), day.getMonth(), day.getDate(), START_HOUR + i))}
                  />
                </div>
              ))}

              {dayEvents.map((ev) => {
                const style = eventStyle(ev);
                return (
                  <button
                    key={ev.id}
                    className="absolute left-1 right-1 overflow-hidden rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-white transition-opacity hover:opacity-80"
                    style={{
                      top: style.top,
                      height: style.height,
                      backgroundColor: style.bg,
                    }}
                    onClick={() => onSelectEvent(ev)}
                  >
                    <p className="truncate">{ev.title}</p>
                    <p className="text-[9px] opacity-80">
                      {format(new Date(ev.start_time), 'HH:mm')} – {format(new Date(ev.end_time), 'HH:mm')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
