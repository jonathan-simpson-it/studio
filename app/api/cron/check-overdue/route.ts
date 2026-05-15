import { NextRequest, NextResponse } from 'next/server';
import { processOverdueChecks } from '@/lib/db/actions/invoices';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processOverdueChecks();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Overdue check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
