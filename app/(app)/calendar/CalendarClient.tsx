'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/actions/settings';
import { listCalendars, getEventsForCalendar, createEvent, updateEvent, deleteEvent, processPendingReminders } from '@/lib/db/actions/calendar';
import { syncAllGithubIssues } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { YearView } from './YearView';
import { EventModal } from './EventModal';
import { ExpenseWidget } from './ExpenseWidget';
import { CalendarSummaryDialog } from './CalendarSummaryDialog';
import { CreateCalendarDialog } from './CreateCalendarDialog';
import type { CalendarEvent, Calendar } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
} from 'date-fns';
import { toast } from 'sonner';

type CalendarView = 'month' | 'week' | 'year';

interface SyntheticTask {
  id: string;
  title: string;
  due_date: string;
  project_id: string | null;
  assignee_id: string | null;
}

interface SyntheticMilestone {
  id: string;
  title: string;
  due_date: string;
  project_id: string;
}

interface SyntheticInvoice {
  id: string;
  invoice_number: string;
  due_date: string;
  client_id: string;
  project_id: string | null;
}

interface SyntheticProposal {
  id: string;
  proposal_number: string;
  expires_at: string;
  client_id: string;
}

interface SyntheticGithubIssue {
  id: string;
  title: string;
  github_url: string | null;
  project_id: string;
  milestone_due_on: string;
}

export default function CalendarClient({
  calendars: initCalendars,
  events: initEvents,
  tasks,
  milestones,
  invoices,
  proposals,
  githubIssues,
}: {
  calendars: Calendar[];
  events: CalendarEvent[];
  tasks: SyntheticTask[];
  milestones: SyntheticMilestone[];
  invoices: SyntheticInvoice[];
  proposals: SyntheticProposal[];
  githubIssues: SyntheticGithubIssue[];
}) {
  const router = useRouter();
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [createCalOpen, setCreateCalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    processPendingReminders().catch(() => {});
  }, []);

  async function handleSyncGithub() {
    setSyncing(true);
    try {
      const result = await syncAllGithubIssues();
      toast.success(`GitHub synced: ${result.synced} issues`);
    } catch {
      toast.error('GitHub sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const { allCalendars, allEvents } = useMemo(() => {
    const vc: Calendar[] = [];

    if (tasks.length > 0) {
      vc.push({ id: '__tasks__', name: 'Tasks', color: '#f59e0b', is_default: false, type: 'shared', sync_to_google: false, google_calendar_id: null, created_by: '', created_at: '' });
    }
    if (milestones.length > 0) {
      vc.push({ id: '__milestones__', name: 'Milestones', color: '#10b981', is_default: false, type: 'shared', sync_to_google: false, google_calendar_id: null, created_by: '', created_at: '' });
    }
    if (invoices.length > 0) {
      vc.push({ id: '__invoices__', name: 'Invoices', color: '#e11d48', is_default: false, type: 'shared', sync_to_google: false, google_calendar_id: null, created_by: '', created_at: '' });
    }
    if (proposals.length > 0) {
      vc.push({ id: '__proposals__', name: 'Proposals', color: '#8b5cf6', is_default: false, type: 'shared', sync_to_google: false, google_calendar_id: null, created_by: '', created_at: '' });
    }
    if (githubIssues.length > 0) {
      vc.push({ id: '__github__', name: 'GitHub Milestones', color: '#6366f1', is_default: false, type: 'shared', sync_to_google: false, google_calendar_id: null, created_by: '', created_at: '' });
    }

    const baseEvent = {
      google_events: [] as { user_id: string; google_event_id: string }[],
      sync_status: 'synced' as const,
      sync_retry_count: 0,
    };

    const se: CalendarEvent[] = [
      ...tasks.map((t): CalendarEvent => ({
        ...baseEvent,
        id: `task-${t.id}`, calendar_id: '__tasks__', title: t.title,
        description: null, location: null,
        start_time: `${t.due_date}T00:00:00.000Z`, end_time: `${t.due_date}T23:59:59.000Z`,
        is_all_day: true, color: '#f59e0b', rrule: null,
        external_source_id: null, external_event_id: null,
        version: 1, created_by: '', created_at: '', updated_at: '',
        source_type: 'task', source_id: t.id, source_url: `/tasks/${t.id}`,
      })),
      ...milestones.map((m): CalendarEvent => ({
        ...baseEvent,
        id: `milestone-${m.id}`, calendar_id: '__milestones__', title: m.title,
        description: null, location: null,
        start_time: `${m.due_date}T00:00:00.000Z`, end_time: `${m.due_date}T23:59:59.000Z`,
        is_all_day: true, color: '#10b981', rrule: null,
        external_source_id: null, external_event_id: null,
        version: 1, created_by: '', created_at: '', updated_at: '',
        source_type: 'milestone', source_id: m.id, source_url: `/projects/${m.project_id}`,
      })),
      ...invoices.map((inv): CalendarEvent => ({
        ...baseEvent,
        id: `invoice-${inv.id}`, calendar_id: '__invoices__', title: `Invoice ${inv.invoice_number}`,
        description: null, location: null,
        start_time: `${inv.due_date}T00:00:00.000Z`, end_time: `${inv.due_date}T23:59:59.000Z`,
        is_all_day: true, color: '#e11d48', rrule: null,
        external_source_id: null, external_event_id: null,
        version: 1, created_by: '', created_at: '', updated_at: '',
        source_type: 'invoice', source_id: inv.id, source_url: `/invoices/${inv.id}`,
      })),
      ...proposals.map((p): CalendarEvent => ({
        ...baseEvent,
        id: `proposal-${p.id}`, calendar_id: '__proposals__', title: `Proposal ${p.proposal_number}`,
        description: null, location: null,
        start_time: `${p.expires_at.split('T')[0]}T00:00:00.000Z`,
        end_time: `${p.expires_at.split('T')[0]}T23:59:59.000Z`,
        is_all_day: true, color: '#8b5cf6', rrule: null,
        external_source_id: null, external_event_id: null,
        version: 1, created_by: '', created_at: '', updated_at: '',
        source_type: 'proposal', source_id: p.id, source_url: `/proposals/${p.id}`,
      })),
      ...githubIssues.map((gh): CalendarEvent => ({
        ...baseEvent,
        id: `github-${gh.id}`, calendar_id: '__github__', title: `[GitHub] ${gh.title}`,
        description: null, location: null,
        start_time: `${gh.milestone_due_on.split('T')[0]}T00:00:00.000Z`,
        end_time: `${gh.milestone_due_on.split('T')[0]}T23:59:59.000Z`,
        is_all_day: true, color: '#6366f1', rrule: null,
        external_source_id: null, external_event_id: null,
        version: 1, created_by: '', created_at: '', updated_at: '',
        source_type: 'github_issue', source_id: gh.id, source_url: gh.github_url || undefined,
      })),
    ];

    return { allCalendars: [...calendars, ...vc], allEvents: [...events, ...se] };
  }, [calendars, events, tasks, milestones, invoices, proposals, githubIssues]);

  const loadEvents = useCallback(async () => {
    const allCals = await listCalendars();
    if (allCals.length > 0) {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const allEvts = await Promise.all(
        allCals.map((cal: any) => getEventsForCalendar(cal.id, monthStart, monthEnd))
      );
      setEvents(allEvts.flat());
      setCalendars(allCals);
    }
  }, []);

  function navigatePrev() {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subYears(currentDate, 1));
  }

  function navigateNext() {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addYears(currentDate, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function getDateRange(): { start: Date; end: Date } {
    return {
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    };
  }

  const filteredEvents = allEvents.filter((e) => selectedCalendars.has(e.calendar_id));

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
    if (event.source_type) {
      const sourceUrl = event.source_url;
      if (sourceUrl) {
        if (event.source_type === 'github_issue') {
          window.open(sourceUrl, '_blank');
        } else {
          router.push(sourceUrl);
        }
      }
      return;
    }
    setEditingEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  }

  async function handleSave(eventData: Partial<CalendarEvent>) {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      toast.error('Authentication required');
      return;
    }

    if (editingEvent) {
      try {
        await updateEvent(editingEvent.id, { ...eventData } as Record<string, unknown>);
        toast.success('Event updated');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update event');
        return;
      }
    } else {
      const calId = eventData.calendar_id || calendars[0]?.id;
      if (!calId) { toast.error('No calendar available'); return; }

      try {
        await createEvent({
          ...eventData,
          calendar_id: calId,
          created_by: currentUser.id,
        });
        toast.success('Event created');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create event');
        return;
      }
    }

    setModalOpen(false);
    setEditingEvent(null);
    loadEvents();
  }

  async function handleDelete(eventId: string) {
    try {
      await deleteEvent(eventId);
      toast.success('Event deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
      return;
    }
    setModalOpen(false);
    setEditingEvent(null);
    loadEvents();
  }

  async function handleCalendarCreated() {
    const allCals = await listCalendars();
    setCalendars(allCals);
  }

  const titleText =
    view === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : view === 'week'
        ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
        : format(currentDate, 'yyyy');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-center whitespace-nowrap">{titleText}</h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSyncGithub} disabled={syncing}>
            <GitBranch className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync GitHub'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSummaryOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Summarize
          </Button>
          <div className="flex items-center rounded-lg border p-0.5">
            {(['month', 'week', 'year'] as CalendarView[]).map((v) => (
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
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 overflow-x-auto">
          {view === 'month' && (
            <MonthView
              date={currentDate}
              events={filteredEvents}
              calendars={allCalendars}
              selectedCalendars={selectedCalendars}
              onToggleCalendar={toggleCalendar}
              onSelectEvent={openEdit}
              onCreateEvent={openCreate}
              onCreateCalendar={() => setCreateCalOpen(true)}
            />
          )}
          {view === 'week' && (
            <WeekView
              date={currentDate}
              events={filteredEvents}
              calendars={allCalendars}
              selectedCalendars={selectedCalendars}
              onToggleCalendar={toggleCalendar}
              onSelectEvent={openEdit}
              onCreateEvent={openCreate}
              onCreateCalendar={() => setCreateCalOpen(true)}
            />
          )}
          {view === 'year' && (
            <YearView
              date={currentDate}
              events={filteredEvents}
              onSelectMonth={(d) => {
                setCurrentDate(d);
                setView('month');
              }}
            />
          )}
        </div>

        <div className="w-64 flex-shrink-0 space-y-3">
          <Button className="w-full" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New Event
          </Button>
          <ExpenseWidget date={currentDate} view={view} />
        </div>
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

      <CalendarSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        currentDate={currentDate}
        events={filteredEvents}
      />

      <CreateCalendarDialog
        open={createCalOpen}
        onOpenChange={setCreateCalOpen}
        onCreated={handleCalendarCreated}
      />
    </div>
  );
}
