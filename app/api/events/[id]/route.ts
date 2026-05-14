import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Event, EventComment } from '@/lib/db/models/calendar';
import { ActivityLog } from '@/lib/db/models/crm';
import { auth } from '@/auth';

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

  const existing = await Event.findById(id).select('version').lean({ virtuals: true }) as { version?: number } | null;

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
    { new: true }
  ).lean({ virtuals: true });

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
  await Event.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
