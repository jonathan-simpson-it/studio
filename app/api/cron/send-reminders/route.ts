import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Reminder, Event } from '@/lib/db/models/calendar';
import { User } from '@/lib/db/models/core';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connect();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const reminders = await Reminder.find({ is_sent: false, trigger_at: { $gte: yesterdayStart, $lt: todayStart } })
    .limit(50).sort({ trigger_at: 1 }).lean({ virtuals: true });

  if (!reminders?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const eventIds = [...new Set(reminders.map((r: any) => r.event_id))];
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('title start_time created_by').lean({ virtuals: true });
  const eventMap = new Map(events.map((e: any) => [e._id.toString(), e]));

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';
  let sent = 0;

  for (const reminder of reminders) {
    const r = reminder as any;
    const event = eventMap.get(r.event_id?.toString()) as any;

    if (r.method === 'email' && event?.created_by) {
      const userData = await User.findById(event.created_by).select('email').lean({ virtuals: true });
      if ((userData as any)?.email) {
        try {
          await resend.emails.send({
            from: `Studio <${from}>`,
            to: (userData as any).email,
            subject: `Reminder: ${event.title}`,
            text: `Your event "${event.title}" is coming up at ${new Date(event.start_time).toLocaleString()}.`,
          });
        } catch (err) {
          console.error('Failed to send reminder email:', err);
        }
      }
    }

    await Reminder.findByIdAndUpdate(r._id, { is_sent: true });
    sent++;
  }

  return NextResponse.json({ sent });
}
