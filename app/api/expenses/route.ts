import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const calendarId = url.searchParams.get('calendar_id');

  let query = supabase.from('daily_expenses').select('*').order('created_at', { ascending: false });

  if (date) {
    query = query.eq('date', date);
  }
  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const body = await request.json();
  const { calendar_id, date, amount, category, note } = body;

  if (!amount || !date) {
    return NextResponse.json({ error: 'amount and date required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('daily_expenses')
    .insert({
      calendar_id: calendar_id || null,
      user_id: session.user.id,
      date,
      amount,
      category: category || 'Other',
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
