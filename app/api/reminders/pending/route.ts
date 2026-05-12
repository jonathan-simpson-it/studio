import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reminders')
    .select('*, event:events(title, start_time, calendar_id)')
    .eq('is_sent', false)
    .lte('trigger_at', now)
    .order('trigger_at')
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data && data.length > 0) {
    await supabase
      .from('reminders')
      .update({ is_sent: true })
      .in(
        'id',
        data.map((r) => r.id)
      );
  }

  return NextResponse.json(data || []);
}
