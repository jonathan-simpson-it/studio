import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateDailyExpense, deleteDailyExpense } from '@/lib/db/actions/calendar';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { amount, category, note, date } = body;

  const data = await updateDailyExpense(id, { amount, category, note, date });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await deleteDailyExpense(id);
  return NextResponse.json({ success: true });
}
