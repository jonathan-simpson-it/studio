import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, Event, CalendarShare } from '@/lib/db/models/calendar';
import { auth } from '@/auth';
import { generateICS } from '@/lib/calendar-engine/ics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token');

  await connect();

  let eventsData: { data: any[]; name: string } | null = null;

  if (session?.user) {
    const cal = await Calendar.findById(id).select('name').lean({ virtuals: true }) as { _id: string; name: string } | null;

    const data = await Event.find({
      calendar_id: id,
      start_time: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ start_time: 1 })
      .lean({ virtuals: true });

    eventsData = { data: data as any[], name: cal?.name || 'Studio Calendar' };
  } else if (token) {
    const share = await CalendarShare.findOne({ token, is_active: true }).select('calendar_id').lean({ virtuals: true }) as { calendar_id: string } | null;

    if (share) {
      const cal = await Calendar.findById(share.calendar_id).select('name').lean({ virtuals: true }) as { _id: string; name: string } | null;

      const data = await Event.find({
        calendar_id: share.calendar_id,
        start_time: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      })
        .sort({ start_time: 1 })
        .lean({ virtuals: true });

      eventsData = { data: data as any[], name: cal?.name || 'Studio Calendar' };
    }
  }

  if (!eventsData?.data) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const icsString = generateICS(
    (eventsData.data || []).map((ev: any) => ({
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
