import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*, event:events(title, start_time, calendar_id, created_by)')
    .eq('is_sent', false)
    .lte('trigger_at', now)
    .limit(50);

  if (error || !reminders?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';
  let sent = 0;

  for (const reminder of reminders) {
    const event = reminder.event as { title: string; start_time: string; created_by: string } | null;

    if (reminder.method === 'email' && event?.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', event.created_by)
        .single();

      if (userData?.email) {
        try {
          await resend.emails.send({
            from: `Studio <${from}>`,
            to: userData.email,
            subject: `Reminder: ${event.title}`,
            text: `Your event "${event.title}" is coming up at ${new Date(event.start_time).toLocaleString()}.`,
          });
        } catch (err) {
          console.error('Failed to send reminder email:', err);
        }
      }
    }

    await supabase
      .from('reminders')
      .update({ is_sent: true })
      .eq('id', reminder.id);

    sent++;
  }

  return NextResponse.json({ sent });
}
