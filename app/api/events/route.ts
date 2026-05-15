import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, Event } from '@/lib/db/models/calendar';
import { ActivityLog } from '@/lib/db/models/crm';
import { auth } from '@/auth';
import { detectConflicts } from '@/lib/calendar-engine/conflicts';
import { syncEventToGoogle } from '@/lib/google/calendar-write';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const url = new URL(request.url);
  const calendarId = url.searchParams.get('calendar_id');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  const filter: Record<string, unknown> = {};
  if (calendarId) filter.calendar_id = calendarId;
  if (start) filter.start_time = { $gte: new Date(start) };
  if (end) filter.end_time = { $lte: new Date(end) };

  const data = await Event.find(filter).sort({ start_time: 1 }).lean({ virtuals: true });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

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
    const existing = await Event.find({
      calendar_id,
      _id: { $ne: body.id || '' },
    }).lean({ virtuals: true });

    if (existing) {
      const conflicts = detectConflicts(existing as any[], {
        id: '',
        title,
        start_time,
        end_time,
        is_all_day: is_all_day || false,
        rrule: rrule || null,
        calendar_id,
      } as any);

      if (conflicts.length > 0) {
        return NextResponse.json({ conflicts }, { status: 409 });
      }
    }
  }

  const event = await Event.create({
    calendar_id,
    title,
    description: description || null,
    location: location || null,
    start_time: new Date(start_time),
    end_time: new Date(end_time),
    is_all_day: is_all_day || false,
    color: color || null,
    rrule: rrule || null,
    created_by: session.user.id,
  });

  const result = event.toObject({ virtuals: true });
  const eventId = result._id.toString();

  const calendar = await Calendar.findById(calendar_id).lean({ virtuals: true });
  const cal = calendar as any;

  if (cal?.sync_to_google) {
    const syncResult = await syncEventToGoogle(
      {
        id: eventId,
        calendar_id,
        title,
        description: description || null,
        location: location || null,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        is_all_day: is_all_day || false,
      },
      { type: cal.type, google_calendar_id: cal.google_calendar_id },
      session.user.id
    );

    await Event.findByIdAndUpdate(eventId, {
      google_events: syncResult.google_events,
      sync_status: syncResult.sync_status,
    });
    (result as any).sync_status = syncResult.sync_status;
    (result as any).google_events = syncResult.google_events;
  }

  await ActivityLog.create({
    entity_type: 'event',
    entity_id: eventId,
    action: 'created',
    actor_id: session.user.id,
    meta: { title },
  });

  return NextResponse.json(result, { status: 201 });
}
