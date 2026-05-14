import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { EventComment } from '@/lib/db/models/calendar';
import { auth } from '@/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await connect();

  const data = await EventComment.find({ event_id: id })
    .sort({ created_at: 1 })
    .lean({ virtuals: true });

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { text } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 });
  }

  await connect();

  const comment = await EventComment.create({
    event_id: id,
    user_id: session.user.id,
    text: text.trim(),
  });

  const result = comment.toObject({ virtuals: true });

  return NextResponse.json(result, { status: 201 });
}
