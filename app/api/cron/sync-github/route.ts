import { NextRequest, NextResponse } from 'next/server';
import { syncAllGithubIssues } from '@/lib/db/actions/projects';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAllGithubIssues();
    return NextResponse.json(result);
  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
