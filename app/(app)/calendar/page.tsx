import { createServer } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export const metadata = {
  title: 'Calendar — Studio',
};

export default async function CalendarPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [calendarsResult, eventsResult] = await Promise.all([
    supabase.from('calendars').select('*').order('created_at'),
    supabase.from('events').select('*').order('start_time'),
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
      const { data: memberData } = await supabase
        .from('calendar_members')
        .insert({ calendar_id: newCal.id, user_id: user.id, role: 'OWNER' })
        .select();
    }
  }

  return (
    <CalendarClient
      calendars={calendars}
      events={eventsResult.data || []}
    />
  );
}
