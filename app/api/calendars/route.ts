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
      const isMember = members.some((m: any) => m.user_id === session!.user!.id);
      const isOwner = members.some((m: any) => m.user_id === session!.user!.id && m.role === 'OWNER');
      return { ...cal, members, isMember, isOwner };
    })
  );

  const filtered = calendarsWithMembers.filter((cal) => {
    if (cal.type === 'personal') {
      return (cal as any).created_by === session?.user?.id;
    }
    return (cal as any).isMember;
  });

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connect();

  const body = await request.json();
  const { name, color, type, member_ids, google_calendar_id } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const cal = await Calendar.create({
    name,
    color: color || '#3b82f6',
    type: type || 'personal',
    google_calendar_id: google_calendar_id || null,
    created_by: session.user.id,
  });
  const result = cal.toObject({ virtuals: true });

  await CalendarMember.create({
    calendar_id: result._id.toString(),
    user_id: session.user.id,
    role: 'OWNER',
  });

  if (type === 'shared' && Array.isArray(member_ids)) {
    const memberDocs = member_ids
      .filter((id: string) => id !== session.user!.id)
      .map((id: string) => ({
        calendar_id: result._id.toString(),
        user_id: id,
        role: 'EDITOR',
      }));
    if (memberDocs.length > 0) {
      await CalendarMember.insertMany(memberDocs);
    }
  }

  return NextResponse.json(result, { status: 201 });
}
