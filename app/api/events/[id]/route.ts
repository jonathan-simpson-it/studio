import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, Event, EventComment } from '@/lib/db/models/calendar';
import { ActivityLog } from '@/lib/db/models/crm';
import { auth } from '@/auth';
import { syncEventToGoogle, deleteGoogleEvent } from '@/lib/google/calendar-write';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await connect();

  const event = await Event.findById(id).lean({ virtuals: true });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comments = await EventComment.find({ event_id: id }).sort({ created_at: 1 }).lean({ virtuals: true });

  return NextResponse.json({ ...event, comments });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const {
    title,
    description,
    location,
    start_time,
    end_time,
    is_all_day,
    color,
    rrule,
    calendar_id,
  } = body;

  await connect();

  const existing = await Event.findById(id).select('version google_events').lean({ virtuals: true }) as { version?: number; google_events?: { user_id: string; google_event_id: string }[] } | null;

  const data = await Event.findByIdAndUpdate(
    id,
    {
      title,
      description: description || null,
      location: location || null,
      start_time,
      end_time,
      is_all_day: is_all_day || false,
      color: color || null,
      rrule: rrule || null,
      calendar_id,
      version: (existing?.version || 0) + 1,
      updated_at: new Date(),
    },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const calendar = await Calendar.findById(calendar_id).lean({ virtuals: true });
  const cal = calendar as any;

  if (cal?.sync_to_google) {
    const syncResult = await syncEventToGoogle(
      {
        id,
        calendar_id,
        title,
        description: description || null,
        location: location || null,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        is_all_day: is_all_day || false,
        google_events: (existing as any)?.google_events || [],
      },
      { type: cal.type, google_calendar_id: cal.google_calendar_id },
      session.user.id
    );

    await Event.findByIdAndUpdate(id, {
      google_events: syncResult.google_events,
      sync_status: syncResult.sync_status,
    });
    (data as any).sync_status = syncResult.sync_status;
    (data as any).google_events = syncResult.google_events;
  }

  await ActivityLog.create({
    entity_type: 'event',
    entity_id: id,
    action: 'updated',
    actor_id: session.user.id,
    meta: { title: (data as any).title },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await connect();

  const event = await Event.findById(id).select('calendar_id google_events').lean({ virtuals: true }) as any;
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const calendar = await Calendar.findById(event.calendar_id).lean({ virtuals: true }) as any;

  if (calendar?.sync_to_google && event.google_events?.length > 0) {
    for (const ref of event.google_events) {
      try {
        await deleteGoogleEvent(ref.user_id, calendar.google_calendar_id, ref.google_event_id);
      } catch (err) {
        console.error(`Failed to delete Google event ${ref.google_event_id}:`, err);
      }
    }
  }

  await Event.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
