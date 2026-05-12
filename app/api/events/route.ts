import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';
import { detectConflicts } from '@/lib/calendar-engine/conflicts';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const url = new URL(request.url);
  const calendarId = url.searchParams.get('calendar_id');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  let query = supabase.from('events').select('*').order('start_time');

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }
  if (start) {
    query = query.gte('start_time', start);
  }
  if (end) {
    query = query.lte('end_time', end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const body = await request.json();
  const {
    calendar_id,
    title,
    description,
    location,
    start_time,
    end_time,
    is_all_day,
    color,
    rrule,
    check_conflicts,
  } = body;

  if (!title || !start_time || !end_time || !calendar_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (check_conflicts) {
    const { data: existing } = await supabase
      .from('events')
      .select('*')
      .eq('calendar_id', calendar_id)
      .neq('id', body.id || '');

    if (existing) {
      const conflicts = detectConflicts(existing, {
        id: '',
        title,
        start_time,
        end_time,
        is_all_day: is_all_day || false,
        rrule: rrule || null,
        calendar_id,
      });

      if (conflicts.length > 0) {
        return NextResponse.json({ conflicts }, { status: 409 });
      }
    }
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      calendar_id,
      title,
      description: description || null,
      location: location || null,
      start_time,
      end_time,
      is_all_day: is_all_day || false,
      color: color || null,
      rrule: rrule || null,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('activity_log').insert({
    entity_type: 'event',
    entity_id: data.id,
    action: 'created',
    actor_id: session.user.id,
    meta: { title },
  });

  return NextResponse.json(data, { status: 201 });
}
