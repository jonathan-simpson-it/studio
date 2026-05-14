import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { GoogleInbox } from '@/lib/db/models/google';
import { syncGmailForUser } from '@/lib/db/actions/google';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connect();

    const users = await User.find({ google_id: { $ne: null }, google_refresh_token: { $ne: null } })
      .select('_id')
      .lean();

    let totalSynced = 0;

    for (const user of users) {
      try {
        const userId = (user as any)._id.toString();
        const activeInboxes = await GoogleInbox.find({ user_id: userId, is_active: true }).lean();

        for (const inbox of activeInboxes) {
          try {
            const result = await syncGmailForUser(userId, (inbox as any).label_id);
            totalSynced += result.synced;
          } catch (err) {
            console.error(`Failed to sync inbox ${(inbox as any).name}:`, err);
          }
        }
      } catch (err) {
        console.error(`Failed to sync Gmail for user ${(user as any)._id}:`, err);
      }
    }

    return NextResponse.json({ synced: totalSynced, users: users.length });
  } catch (error) {
    console.error('Gmail sync cron error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
