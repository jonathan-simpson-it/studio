import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { User } from '@/lib/db/models/core';
import { GoogleCalendarSync } from '@/lib/db/models/google';
import { syncAllGoogleCalendarsForUser } from '@/lib/db/actions/google';

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
        const result = await syncAllGoogleCalendarsForUser((user as any)._id.toString());
        totalSynced += result.synced;
      } catch (err) {
        console.error(`Failed to sync calendars for user ${(user as any)._id}:`, err);
      }
    }

    return NextResponse.json({ synced: totalSynced, users: users.length });
  } catch (error) {
    console.error('Google calendar sync cron error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
