import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const { data, error } = await supabase
    .from('calendars')
    .select('*, members:calendar_members(*)')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServer();

  const body = await request.json();
  const { name, color } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data: cal, error } = await supabase
    .from('calendars')
    .insert({ name, color: color || '#3b82f6', created_by: session.user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('calendar_members').insert({
    calendar_id: cal.id,
    user_id: session.user.id,
    role: 'OWNER',
  });

  return NextResponse.json(cal, { status: 201 });
}
