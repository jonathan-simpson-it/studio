import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';
import { detectConflicts } from '@/lib/calendar-engine/conflicts';
import type { CalendarEvent } from '@/types';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const body = await request.json();
  const { calendar_id, start_time, end_time, rrule, exclude_event_id } = body;

  if (!start_time || !end_time) {
    return NextResponse.json({ error: 'start_time and end_time required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('events')
    .select('*')
    .eq('calendar_id', calendar_id)
    .neq('id', exclude_event_id || '');

  const newEvent = {
    id: '',
    title: '',
    start_time,
    end_time,
    is_all_day: false,
    rrule: rrule || null,
    calendar_id,
  } as CalendarEvent & { title: string };

  const conflicts = detectConflicts(existing || [], newEvent);

  return NextResponse.json({ conflicts });
}
