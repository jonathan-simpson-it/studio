'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Flag, FileText, GitBranch, Plus } from 'lucide-react';
import type { CalendarEvent, Calendar } from '@/types';

function sourceIcon(sourceType?: string) {
  switch (sourceType) {
    case 'task': return <CheckSquare className="inline h-2.5 w-2.5 mr-0.5" />;
    case 'milestone': return <Flag className="inline h-2.5 w-2.5 mr-0.5" />;
    case 'invoice': return <FileText className="inline h-2.5 w-2.5 mr-0.5" />;
    case 'proposal': return <FileText className="inline h-2.5 w-2.5 mr-0.5" />;
    case 'github_issue': return <GitBranch className="inline h-2.5 w-2.5 mr-0.5" />;
    default: return null;
  }
}

interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  selectedCalendars: Set<string>;
  onToggleCalendar: (id: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date) => void;
  onCreateCalendar?: () => void;
}

export function MonthView({
  date,
  events,
  calendars,
  selectedCalendars,
  onToggleCalendar,
  onSelectEvent,
  onCreateEvent,
  onCreateCalendar,
}: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
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
        <Button key="add-calendar" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onCreateCalendar?.()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-7 rounded-lg border">
        {dayNames.map((d) => (
          <div
            key={d}
            className="border-b px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, date);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[100px] border-b border-r p-1 transition-colors hover:bg-accent/30',
                !isCurrentMonth && 'bg-muted/30',
                today && 'bg-blue-50/30 dark:bg-blue-950/20'
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    today
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateEvent(day);
                  }}
                >
                  <span className="text-xs">+</span>
                </Button>
              </div>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, i) => {
                  const cal = calendars.find((c) => c.id === ev.calendar_id);
                  return (
                    <button
                      key={ev.id || `ev-${day.toISOString()}-${i}`}
                      className="w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-white"
                      style={{ backgroundColor: ev.color || cal?.color || '#3b82f6' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                    >
                      {sourceIcon(ev.source_type)}
                      {!ev.is_all_day && format(new Date(ev.start_time), 'HH:mm')}{' '}
                      {ev.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p key="more" className="px-1.5 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
