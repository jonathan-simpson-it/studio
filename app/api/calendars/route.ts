import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Calendar, CalendarMember } from '@/lib/db/models/calendar';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const data = await Calendar.find()
    .sort({ created_at: 1 })
    .lean({ virtuals: true });

  const calendarsWithMembers = await Promise.all(
    (data as any[]).map(async (cal) => {
      const members = await CalendarMember.find({ calendar_id: cal._id.toString() }).lean({ virtuals: true });
      return { ...cal, members };
    })
  );

  return NextResponse.json(calendarsWithMembers);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const body = await request.json();
  const { name, color } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const cal = await Calendar.create({ name, color: color || '#3b82f6', created_by: session.user.id });
  const result = cal.toObject({ virtuals: true });

  await CalendarMember.create({
    calendar_id: result._id.toString(),
    user_id: session.user.id,
    role: 'OWNER',
  });

  return NextResponse.json(result, { status: 201 });
}
