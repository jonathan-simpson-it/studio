import { NextRequest, NextResponse } from 'next/server';
import { processPendingReminders } from '@/lib/db/actions/calendar';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Send reminders error:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}
