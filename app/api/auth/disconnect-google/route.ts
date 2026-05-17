import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { InboxMessage, GoogleCalendarSync, GoogleInbox } from '@/lib/db/models/google';
import { Calendar, CalendarMember } from '@/lib/db/models/calendar';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connect();

  const googleCals = await GoogleCalendarSync.find({ user_id: session.user.id }).lean();
  const googleCalIds = googleCals.map((c: any) => c.google_calendar_id);

  if (googleCalIds.length > 0) {
    const calendarDocs = await Calendar.find({ google_calendar_id: { $in: googleCalIds }, created_by: session.user.id }).lean();
    const calendarDocIds = calendarDocs.map((c: any) => c._id.toString());
    await Promise.all([
      CalendarMember.deleteMany({ calendar_id: { $in: calendarDocIds } }),
      Calendar.deleteMany({ _id: { $in: calendarDocIds } }),
    ]);
  }

  await Promise.all([
    InboxMessage.deleteMany({ user_id: session.user.id }),
    GoogleCalendarSync.deleteMany({ user_id: session.user.id }),
    GoogleInbox.deleteMany({ user_id: session.user.id }),
    User.findByIdAndUpdate(session.user.id, {
      google_id: null,
      google_email: null,
      google_refresh_token: null,
    }),
  ]);

  return NextResponse.json({ success: true });
}
