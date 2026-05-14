import { auth } from '@/auth';
import { listCalendars, getAllEvents, ensureDefaultCalendar } from '@/lib/db/actions/calendar';
import { getAllTasksWithDueDates, getAllMilestonesWithDueDates, getAllSyncedIssuesWithDueDates } from '@/lib/db/actions/projects';
import { getAllInvoicesWithDueDates, getAllProposalsWithExpiry } from '@/lib/db/actions/invoices';
import CalendarClient from './CalendarClient';

export const metadata = {
  title: 'Calendar — Studio',
};

export default async function CalendarPage() {
  const session = await auth();

  const [
    calendars,
    events,
    tasks,
    milestones,
    invoices,
    proposals,
    githubIssues,
  ] = await Promise.all([
    listCalendars(),
    getAllEvents(),
    getAllTasksWithDueDates(),
    getAllMilestonesWithDueDates(),
    getAllInvoicesWithDueDates(),
    getAllProposalsWithExpiry(),
    getAllSyncedIssuesWithDueDates(),
  ]);

  const userId = session?.user?.id;

  if (calendars.length === 0 && userId) {
    const newCal = await ensureDefaultCalendar(userId);
    calendars.push(newCal);
  }

  return (
    <CalendarClient
      calendars={calendars as any[]}
      events={events as any[]}
      tasks={tasks as any[]}
      milestones={milestones as any[]}
      invoices={invoices as any[]}
      proposals={proposals as any[]}
      githubIssues={githubIssues as any[]}
    />
  );
}
