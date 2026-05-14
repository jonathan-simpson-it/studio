import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDailyExpenses, createDailyExpense } from '@/lib/db/actions/calendar';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date');

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const data = await getDailyExpenses(date);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { calendar_id, date, amount, category, note } = body;

  if (!amount || !date) {
    return NextResponse.json({ error: 'amount and date required' }, { status: 400 });
  }

  const data = await createDailyExpense({
    calendar_id: calendar_id || null,
    user_id: session.user.id,
    date,
    amount,
    category: category || 'Other',
    note: note || null,
  });
  return NextResponse.json(data, { status: 201 });
}
