import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';
import { generateICS } from '@/lib/calendar-engine/ics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const supabase = await createServer();
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token');

  let eventsData;

  if (session?.user) {
    const { data: cal } = await supabase
      .from('calendars')
      .select('name')
      .eq('id', id)
      .single();

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('calendar_id', id)
      .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('start_time', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time');

    eventsData = { data, name: cal?.name };
  } else if (token) {
    const { data: share } = await supabase
      .from('calendar_shares')
      .select('calendar_id')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (share) {
      const { data: cal } = await supabase
        .from('calendars')
        .select('name')
        .eq('id', share.calendar_id)
        .single();

      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('calendar_id', share.calendar_id)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time');

      eventsData = { data, name: cal?.name };
    }
  }

  if (!eventsData?.data) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const icsString = generateICS(
    (eventsData.data || []).map((ev) => ({
      summary: ev.title,
      description: ev.description,
      location: ev.location,
      start: ev.start_time,
      end: ev.end_time,
      rrule: ev.rrule,
    })),
    eventsData.name || 'Studio Calendar'
  );

  return new NextResponse(icsString, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="calendar-${id}.ics"`,
    },
  });
}
