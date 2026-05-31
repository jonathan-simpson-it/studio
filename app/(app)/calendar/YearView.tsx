'use client';

import {
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  setMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types';

interface YearViewProps {
  date: Date;
  events: CalendarEvent[];
  onSelectMonth: (date: Date) => void;
}

export function YearView({ date, events, onSelectMonth }: YearViewProps) {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((ev) => {
      const start = new Date(ev.start_time);
      const end = new Date(ev.end_time);
      const dStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
      const dEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      return start < dEnd && end > dStart;
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {months.map((month, idx) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: calStart, end: calEnd });
        const monthEventCount = events.filter((ev) => {
          const evStart = new Date(ev.start_time);
          return evStart.getMonth() === idx && evStart.getFullYear() === year;
        }).length;

        return (
          <div
            key={idx}
            className="rounded-lg border p-2 cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => onSelectMonth(month)}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">{format(month, 'MMMM')}</h3>
              {monthEventCount > 0 && (
                <span className="text-[10px] text-muted-foreground">{monthEventCount} events</span>
              )}
            </div>

            <div className="grid grid-cols-7 mb-1">
              {dayNames.map((d) => (
                <div key={d} className="text-center text-[8px] text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const today = isToday(day);
                const inMonth = isSameMonth(day, month);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'text-center text-[10px] py-0.5',
                      !inMonth && 'text-muted-foreground/30',
                      today && 'font-bold text-primary'
                    )}
                  >
                    {format(day, 'd')}
                    {dayEvents.length > 0 && inMonth && (
                      <div className="mx-auto h-1 w-1 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
