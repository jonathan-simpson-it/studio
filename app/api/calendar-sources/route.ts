import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { CalendarSource, Calendar } from '@/lib/db/models/calendar';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const data = await CalendarSource.find()
    .sort({ created_at: 1 })
    .lean({ virtuals: true });

  const sourcesWithCalendar = await Promise.all(
    (data as any[]).map(async (source) => {
      const calendar = await Calendar.findById(source.calendar_id).select('name').lean({ virtuals: true });
      return { ...source, calendar: calendar || null };
    })
  );

  return NextResponse.json(sourcesWithCalendar);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const body = await request.json();
  const { calendar_id, url } = body;

  if (!calendar_id || !url) {
    return NextResponse.json({ error: 'calendar_id and url required' }, { status: 400 });
  }

  const source = await CalendarSource.create({ calendar_id, url });
  const result = source.toObject({ virtuals: true });

  return NextResponse.json(result, { status: 201 });
}
