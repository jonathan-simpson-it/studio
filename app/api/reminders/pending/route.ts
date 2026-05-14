import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPendingReminders } from '@/lib/db/actions/calendar';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await getPendingReminders();

  if (data && data.length > 0) {
    const { markRemindersSent } = await import('@/lib/db/actions/calendar');
    await markRemindersSent(data.map((r: any) => r._id.toString()));
  }

  return NextResponse.json(data || []);
}
