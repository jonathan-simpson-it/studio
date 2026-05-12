import { createServer } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export const metadata = {
  title: 'Calendar — Studio',
};

export default async function CalendarPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    calendarsResult,
    eventsResult,
    tasksResult,
    milestonesResult,
    invoicesResult,
    proposalsResult,
    githubIssuesResult,
  ] = await Promise.all([
    supabase.from('calendars').select('*').order('created_at'),
    supabase.from('events').select('*').order('start_time'),
    supabase.from('tasks').select('id, title, due_date, project_id, assignee_id').not('due_date', 'is', null),
    supabase.from('milestones').select('id, title, due_date, project_id').not('due_date', 'is', null),
    supabase.from('invoices').select('id, invoice_number, due_date, client_id, project_id').not('due_date', 'is', null),
    supabase.from('proposals').select('id, proposal_number, client_id, expires_at').not('expires_at', 'is', null),
    supabase
      .from('synced_github_issues')
      .select('id, title, github_url, project_id, milestone_due_on')
      .not('milestone_due_on', 'is', null),
  ]);

  const calendars = calendarsResult.data || [];

  if (calendars.length === 0 && user) {
    const { data: newCal } = await supabase
      .from('calendars')
      .insert({ name: 'Personal', color: '#3b82f6', is_default: true, created_by: user.id })
      .select()
      .single();

    if (newCal) {
      calendars.push(newCal);
      await supabase
        .from('calendar_members')
        .insert({ calendar_id: newCal.id, user_id: user.id, role: 'OWNER' })
        .select();
    }
  }

  return (
    <CalendarClient
      calendars={calendars}
      events={eventsResult.data || []}
      tasks={tasksResult.data || []}
      milestones={milestonesResult.data || []}
      invoices={invoicesResult.data || []}
      proposals={proposalsResult.data || []}
      githubIssues={githubIssuesResult.data || []}
    />
  );
}
