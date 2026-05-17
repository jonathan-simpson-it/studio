'use server';

import { connect } from '@/lib/db/connect';
import { Calendar, CalendarMember, Event, Reminder } from '@/lib/db/models/calendar';
import { DailyExpense } from '@/lib/db/models/calendar';
import { toPlain } from '@/lib/db/to-plain';

export async function listCalendars() {
  await connect();
  return toPlain(await Calendar.find().sort({ created_at: 1 }).lean({ virtuals: true }));
}

export async function getAllEvents() {
  await connect();
  return toPlain(await Event.find().sort({ start_time: 1 }).lean({ virtuals: true }));
}

export async function ensureDefaultCalendar(userId: string) {
  await connect();
  let cal = await Calendar.findOne().sort({ created_at: 1 }).lean({ virtuals: true });
  if (!cal) {
    const created = await Calendar.create({ name: 'Personal', color: '#3b82f6', is_default: true, type: 'personal', sync_to_google: true, created_by: userId });
    await CalendarMember.create({ calendar_id: created._id.toString(), user_id: userId, role: 'OWNER' });
    cal = created.toObject({ virtuals: true });
  }
  return toPlain(cal);
}

export async function createCalendar(data: Record<string, unknown>) {
  await connect();
  const cal = await Calendar.create(data);
  return toPlain(cal.toObject({ virtuals: true }));
}

export async function updateCalendar(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Calendar.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteCalendar(id: string) {
  await connect();
  await CalendarMember.deleteMany({ calendar_id: id });
  return toPlain(await Calendar.findByIdAndDelete(id).lean({ virtuals: true }));
}

export async function getCalendarMembers(calendarId: string) {
  await connect();
  return toPlain(await CalendarMember.find({ calendar_id: calendarId }).lean({ virtuals: true }));
}

export async function addCalendarMember(data: Record<string, unknown>) {
  await connect();
  const member = await CalendarMember.create(data);
  return toPlain(member.toObject({ virtuals: true }));
}

export async function getEvents(start: Date, end: Date) {
  await connect();
  return toPlain(await Event.find({
    start_time: { $lte: end },
    end_time: { $gte: start },
  }).sort({ start_time: 1 }).lean({ virtuals: true }));
}

export async function getEventsForCalendar(calendarId: string, start: Date, end: Date) {
  await connect();
  return toPlain(await Event.find({
    calendar_id: calendarId,
    start_time: { $lte: end },
    end_time: { $gte: start },
  }).sort({ start_time: 1 }).lean({ virtuals: true }));
}

export async function createEvent(data: Record<string, unknown>) {
  await connect();
  const event = await Event.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(event.toObject({ virtuals: true }));
}

export async function updateEvent(id: string, data: Record<string, unknown>) {
  await connect();
  const existing = await Event.findById(id).select('version').lean({ virtuals: true }) as { version?: number } | null;
  return toPlain(await Event.findByIdAndUpdate(id, { ...data, version: (existing?.version || 0) + 1, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteEvent(id: string) {
  await connect();
  return toPlain(await Event.findByIdAndDelete(id).lean({ virtuals: true }));
}

export async function checkEventConflicts(
  calendarId: string,
  start: Date,
  end: Date,
  excludeEventId?: string
) {
  await connect();
  const filter: Record<string, unknown> = {
    calendar_id: calendarId,
    start_time: { $lt: end },
    end_time: { $gt: start },
  };
  if (excludeEventId) filter._id = { $ne: excludeEventId };
  return toPlain(await Event.find(filter).lean({ virtuals: true }));
}

// Reminders
export async function processPendingReminders() {
  await connect();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const reminders = await Reminder.find({ is_sent: false, trigger_at: { $gte: yesterdayStart, $lt: todayStart } })
    .limit(50).sort({ trigger_at: 1 }).lean({ virtuals: true });

  if (!reminders?.length) return { sent: 0 };

  const eventIds = [...new Set(reminders.map((r: any) => r.event_id))];
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('title start_time created_by').lean({ virtuals: true });
  const eventMap = new Map(events.map((e: any) => [e._id.toString(), e]));

  const resend = new (await import('resend')).Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';
  let sent = 0;

  for (const reminder of reminders) {
    const r = reminder as any;
    const event = eventMap.get(r.event_id?.toString()) as any;

    if (r.method === 'email' && event?.created_by) {
      const { User } = await import('@/lib/db/models/core');
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

  return { sent };
}

export async function getPendingReminders() {
  await connect();
  const reminders = await Reminder.find({ is_sent: false, trigger_at: { $lte: new Date() } })
    .limit(50).sort({ trigger_at: 1 }).lean({ virtuals: true });

  const eventIds = [...new Set(reminders.map((r: any) => r.event_id))];
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('title start_time calendar_id created_by').lean({ virtuals: true });
  const eventMap = new Map(events.map((e: any) => [e._id.toString(), e]));

  return toPlain(reminders.map((r: any) => ({
    ...r,
    event: eventMap.get(r.event_id?.toString()) || null,
  })));
}

export async function markRemindersSent(ids: string[]) {
  await connect();
  return Reminder.updateMany({ _id: { $in: ids } }, { is_sent: true });
}

// Daily Expenses
export async function getDailyExpenses(date: string) {
  await connect();
  return toPlain(await DailyExpense.find({ date: new Date(date) }).sort({ created_at: 1 }).lean({ virtuals: true }));
}

export async function createDailyExpense(data: Record<string, unknown>) {
  await connect();
  const expense = await DailyExpense.create(data);
  return toPlain(expense.toObject({ virtuals: true }));
}

export async function deleteDailyExpense(id: string) {
  await connect();
  return toPlain(await DailyExpense.findByIdAndDelete(id).lean({ virtuals: true }));
}

export async function updateDailyExpense(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await DailyExpense.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean({ virtuals: true }));
}
