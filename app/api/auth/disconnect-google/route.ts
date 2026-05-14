import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { InboxMessage, GoogleCalendarSync, GoogleInbox } from '@/lib/db/models/google';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connect();

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
