import { NextRequest, NextResponse } from 'next/server';
import { syncAllGithubIssues } from '@/lib/db/actions/projects';
import { syncTicketStatusWithGithub } from '@/lib/db/actions/tickets';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [issuesResult, ticketSyncResult] = await Promise.all([
      syncAllGithubIssues(),
      syncTicketStatusWithGithub(),
    ]);
    return NextResponse.json({ ...issuesResult, ticketStatusSync: ticketSyncResult });
  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
