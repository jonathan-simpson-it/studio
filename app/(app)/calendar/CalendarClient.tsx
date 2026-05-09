'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import { ExpenseWidget } from './ExpenseWidget';
import type { CalendarEvent, Calendar } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import { toast } from 'sonner';

type CalendarView = 'month' | 'week' | 'day';

export default function CalendarClient({ calendars: initCalendars, events: initEvents }: {
  calendars: Calendar[];
  events: CalendarEvent[];
}) {
  const supabase = createClient();
  const [calendars, setCalendars] = useState<Calendar[]>(initCalendars);
  const [events, setEvents] = useState<CalendarEvent[]>(initEvents);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(
    new Set(initCalendars.map((c) => c.id))
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('start_time');
    if (data) setEvents(data);
  }, [supabase]);

  const loadCalendars = useCallback(async () => {
    const { data } = await supabase.from('calendars').select('*').order('created_at');
    if (data) setCalendars(data);
  }, [supabase]);

  function navigatePrev() {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  }

  function navigateNext() {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function getDateRange(): { start: Date; end: Date } {
    if (view === 'month') {
      return {
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
      };
    } else if (view === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfDay(currentDate),
      end: endOfDay(currentDate),
    };
  }

  const filteredEvents = events.filter((e) => selectedCalendars.has(e.calendar_id));

  function toggleCalendar(id: string) {
    const next = new Set(selectedCalendars);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCalendars(next);
  }

  function openCreate(date?: Date) {
    setEditingEvent(null);
    setSelectedDate(date || null);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  }

  async function handleSave(eventData: Partial<CalendarEvent>) {
    const { data: { user } } = await supabase.auth.getUser();

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Event updated');
    } else {
      const calId = eventData.calendar_id || calendars[0]?.id;
      if (!calId) { toast.error('No calendar available'); return; }

      const { error } = await supabase.from('events').insert({
        ...eventData,
        calendar_id: calId,
        created_by: user?.id,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Event created');
    }

    setModalOpen(false);
    setEditingEvent(null);
    loadEvents();
  }

  async function handleDelete(eventId: string) {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted');
    setModalOpen(false);
    setEditingEvent(null);
    loadEvents();
  }

  const titleText =
    view === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : view === 'week'
        ? `${format(getDateRange().start, 'MMM d')} – ${format(getDateRange().end, 'MMM d, yyyy')}`
        : format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold w-64 text-center">{titleText}</h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border p-0.5">
            {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
              <Button
                key={v}
                variant={view === v ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView(v)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New Event
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          {view === 'month' && (
            <MonthView
              date={currentDate}
              events={filteredEvents}
              calendars={calendars}
              selectedCalendars={selectedCalendars}
              onToggleCalendar={toggleCalendar}
              onSelectDate={(d) => {
                setCurrentDate(d);
                setView('day');
              }}
              onSelectEvent={openEdit}
              onCreateEvent={openCreate}
            />
          )}
          {view === 'week' && (
            <WeekView
              date={currentDate}
              events={filteredEvents}
              calendars={calendars}
              onSelectEvent={openEdit}
              onSelectSlot={(d) => openCreate(d)}
            />
          )}
          {view === 'day' && (
            <DayView
              date={currentDate}
              events={filteredEvents}
              calendars={calendars}
              onSelectEvent={openEdit}
              onSelectSlot={(d) => openCreate(d)}
            />
          )}
        </div>

        <ExpenseWidget date={currentDate} view={view} />
      </div>

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editingEvent}
        calendars={calendars}
        events={events}
        defaultDate={selectedDate}
        onSave={handleSave}
        onDelete={editingEvent ? () => handleDelete(editingEvent.id) : undefined}
      />
    </div>
  );
}
