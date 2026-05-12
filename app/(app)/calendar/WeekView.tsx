'use client';

import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  format,
  differenceInMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CalendarEvent, Calendar } from '@/types';

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  selectedCalendars: Set<string>;
  onToggleCalendar: (id: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date) => void;
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({
  date,
  events,
  calendars,
  selectedCalendars,
  onToggleCalendar,
  onSelectEvent,
  onCreateEvent,
}: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const now = new Date();
  const scrollToHour = now.getHours();

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((ev) => {
      const start = new Date(ev.start_time);
      const end = new Date(ev.end_time);
      const dStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
      const dEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      return start < dEnd && end > dStart;
    });
  }

  function getEventStyle(ev: CalendarEvent, day: Date) {
    const evStart = new Date(ev.start_time);
    const evEnd = new Date(ev.end_time);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

    const clampStart = evStart < dayStart ? dayStart : evStart;
    const clampEnd = evEnd > dayEnd ? dayEnd : evEnd;

    const minutesFromMidnight = (clampStart.getHours() * 60) + clampStart.getMinutes();
    const durationMinutes = differenceInMinutes(clampEnd, clampStart);

    return {
      top: (minutesFromMidnight / 60) * HOUR_HEIGHT,
      height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, HOUR_HEIGHT / 2),
    };
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {calendars.map((cal) => (
          <Badge
            key={cal.id}
            variant={selectedCalendars.has(cal.id) ? 'default' : 'outline'}
            className="cursor-pointer"
            style={{
              backgroundColor: selectedCalendars.has(cal.id) ? cal.color : undefined,
              borderColor: cal.color,
            }}
            onClick={() => onToggleCalendar(cal.id)}
          >
            {cal.name}
          </Badge>
        ))}
      </div>

      <div className="rounded-lg border">
        {/* Day headers */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b">
          <div className="border-r p-2 text-center text-xs text-muted-foreground" />
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                'border-r p-2 text-center',
                isToday(day) && 'bg-blue-50/30 dark:bg-blue-950/20'
              )}
            >
              <div className="text-xs text-muted-foreground">{dayNames[i]}</div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  isToday(day) && 'bg-primary font-semibold text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events banner */}
        {events.filter((ev) => ev.is_all_day).length > 0 && (
          <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b bg-muted/20">
            <div className="border-r px-2 py-1 text-[10px] text-muted-foreground">All-day</div>
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day).filter((ev) => ev.is_all_day);
              return (
                <div key={i} className="border-r p-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const cal = calendars.find((c) => c.id === ev.calendar_id);
                    return (
                      <button
                        key={ev.id}
                        className="w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white"
                        style={{ backgroundColor: ev.color || cal?.color || '#3b82f6' }}
                        onClick={() => onSelectEvent(ev)}
                      >
                        {ev.title}
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Time grid */}
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-[50px_repeat(7,1fr)]">
            {/* Time labels column */}
            <div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-12 border-b pr-2 text-right text-[10px] text-muted-foreground"
                  style={{ paddingTop: hour === 0 ? 0 : undefined, lineHeight: hour === 0 ? '48px' : undefined }}
                >
                  {hour === 0 ? null : `${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day).filter((ev) => !ev.is_all_day);
              return (
                <div key={dayIdx} className="relative border-r">
                  {/* Hour row lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'h-12 border-b',
                        isToday(day) && 'border-blue-100 dark:border-blue-900/30'
                      )}
                      onClick={() => {
                        const d = new Date(day);
                        d.setHours(hour, 0, 0, 0);
                        onCreateEvent(d);
                      }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((ev) => {
                    const cal = calendars.find((c) => c.id === ev.calendar_id);
                    const style = getEventStyle(ev, day);
                    return (
                      <div
                        key={ev.id}
                        className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded px-1 py-0.5 text-[10px] font-medium text-white cursor-pointer hover:opacity-90"
                        style={{
                          top: style.top,
                          height: style.height,
                          backgroundColor: ev.color || cal?.color || '#3b82f6',
                        }}
                        onClick={() => onSelectEvent(ev)}
                      >
                        <div className="truncate font-semibold">{ev.title}</div>
                        {style.height > 20 && (
                          <div className="truncate opacity-80">
                            {format(new Date(ev.start_time), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday(day) && (
                    <div
                      className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                      style={{ top: (scrollToHour + now.getMinutes() / 60) * HOUR_HEIGHT }}
                    >
                      <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
