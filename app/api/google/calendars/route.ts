import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { listWritableCalendars } from '@/lib/google/calendar-write';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();
  try {
    const calendars = await listWritableCalendars(session.user.id);
    return NextResponse.json(calendars);
  } catch (err) {
    console.error('Failed to list Google Calendars:', err);
    return NextResponse.json({ error: 'Failed to list Google Calendars' }, { status: 500 });
  }
}
