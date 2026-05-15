import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, CalendarMember } from '@/lib/db/models/calendar';
import { User } from '@/lib/db/models/core';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connect();

  const members = await CalendarMember.find({ calendar_id: id }).lean({ virtuals: true });
  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connect();

  const calendar = await Calendar.findById(id).lean({ virtuals: true });
  if (!calendar) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });

  const cal = calendar as any;
  if (cal.type !== 'shared') return NextResponse.json({ error: 'Only shared calendars can have members' }, { status: 400 });

  const body = await request.json();
  const { user_id, role } = body;
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const existing = await CalendarMember.findOne({ calendar_id: id, user_id });
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

  const member = await CalendarMember.create({ calendar_id: id, user_id, role: role || 'EDITOR' });

  if (cal.google_calendar_id) {
    try {
      const { shareGoogleCalendar } = await import('@/lib/google/calendar-write');
      const user = await User.findById(user_id).select('google_email email').lean();
      const u = user as any;
      const email = u?.google_email || u?.email;
      if (email) {
        await shareGoogleCalendar(session.user.id, cal.google_calendar_id, email, 'writer');
      }
    } catch (err) {
      console.error(`Failed to share Google Calendar with new member:`, err);
    }
  }

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId query param required' }, { status: 400 });

  await connect();
  await CalendarMember.deleteOne({ calendar_id: id, user_id: userId });
  return NextResponse.json({ success: true });
}
