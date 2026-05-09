import { createServer } from '@/lib/supabase/server';
import { DashboardClient } from './DashboardClient';

export const metadata = {
  title: 'Dashboard — Studio',
};

export default async function DashboardPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [tasksResult, leadsResult, invoicesResult, projectsResult, milestonesResult, activityResult] =
    await Promise.all([
      supabase.from('tasks').select('*').eq('assignee_id', user?.id).neq('status', 'Done'),
      supabase.from('leads').select('*').not('stage', 'in', '("Won","Lost")'),
      supabase.from('invoices').select('*').in('status', ['Sent', 'Overdue']),
      supabase.from('projects').select('*').neq('status', 'Completed'),
      supabase.from('milestones').select('*').gte('due_date', new Date().toISOString().split('T')[0]).neq('status', 'Completed'),
      supabase.from('activity_log').select('*, actor:users(full_name, avatar_url)').order('created_at', { ascending: false }).limit(10),
    ]);

  return (
    <DashboardClient
      user={user}
      tasks={tasksResult.data || []}
      leads={leadsResult.data || []}
      invoices={invoicesResult.data || []}
      projects={projectsResult.data || []}
      milestones={milestonesResult.data || []}
      activity={activityResult.data || []}
    />
  );
}
