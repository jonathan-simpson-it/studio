'use client';

import {
  isSameDay,
  format,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Calendar } from '@/types';

const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 60;

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (date: Date) => void;
}

export function DayView({ date, events, calendars, onSelectEvent, onSelectSlot }: DayViewProps) {
  const dayEvents = events.filter((ev) => {
    const start = new Date(ev.start_time);
    return isSameDay(start, date);
  });

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

      <div className="relative flex-1">
        <div className="sticky top-0 z-10 border-b py-2 text-center">
          <p className="text-xs text-muted-foreground">{format(date, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 cursor-pointer border-b border-dashed border-border/50 hover:bg-accent/20"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT / 2 }}
              onClick={() => {
                const slotDate = new Date(date);
                slotDate.setHours(START_HOUR + i, 0, 0, 0);
                onSelectSlot(slotDate);
              }}
            />
          ))}

          {dayEvents.map((ev) => {
            const style = eventStyle(ev);
            return (
              <button
                key={ev.id}
                className="absolute left-2 right-2 overflow-hidden rounded px-2 py-1 text-left text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{
                  top: style.top,
                  height: style.height,
                  backgroundColor: style.bg,
                }}
                onClick={() => onSelectEvent(ev)}
              >
                <p className="font-semibold">{ev.title}</p>
                <p className="text-xs opacity-80">
                  {format(new Date(ev.start_time), 'HH:mm')} – {format(new Date(ev.end_time), 'HH:mm')}
                </p>
                {ev.location && <p className="text-xs opacity-70">{ev.location}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
