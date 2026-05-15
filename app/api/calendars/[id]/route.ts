import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, CalendarMember, Event } from '@/lib/db/models/calendar';
import { auth } from '@/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await connect();

  const calendar = await Calendar.findById(id).lean({ virtuals: true });
  if (!calendar) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const members = await CalendarMember.find({ calendar_id: id }).lean({ virtuals: true });
  const events = await Event.find({ calendar_id: id }).lean({ virtuals: true });

  return NextResponse.json({ ...calendar, members, events });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, color } = body;

  await connect();

  const data = await Calendar.findByIdAndUpdate(id, { name, color }, { returnDocument: 'after' }).lean({ virtuals: true });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
  await Calendar.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
