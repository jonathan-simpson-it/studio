import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connect();
  await User.findByIdAndUpdate(session.user.id, {
    github_id: null,
    github_username: null,
  });

  return NextResponse.json({ success: true });
}
