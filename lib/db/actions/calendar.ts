'use server';

import { connect } from '@/lib/db/connect';
import { Calendar, CalendarMember, Event, Reminder } from '@/lib/db/models/calendar';
import { DailyExpense } from '@/lib/db/models/calendar';
import { toPlain } from '@/lib/db/to-plain';
import { auth } from '@/auth';
import { syncEventToGoogle, deleteGoogleEvent } from '@/lib/google/calendar-write';

export async function listCalendars() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const [calendars, memberships] = await Promise.all([
    Calendar.find().sort({ created_at: 1 }).lean({ virtuals: true }),
    CalendarMember.find({ user_id: session.user.id }).lean({ virtuals: true }),
  ]);
  const memberCalendarIds = new Set(memberships.map((m: any) => m.calendar_id));
  return toPlain(calendars.filter((cal: any) => {
    if (cal.type === 'personal') return cal.created_by === session!.user!.id;
    return memberCalendarIds.has(cal._id.toString());
  }));
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
  const result = event.toObject({ virtuals: true });

  const calendar = await Calendar.findById(data.calendar_id).lean({ virtuals: true });
  const cal = calendar as any;
  if (cal?.google_calendar_id) {
    const syncResult = await syncEventToGoogle(
      {
        id: result._id.toString(),
        calendar_id: result.calendar_id,
        title: result.title,
        description: result.description || null,
        location: result.location || null,
        start_time: result.start_time,
        end_time: result.end_time,
        is_all_day: result.is_all_day || false,
      },
      { type: cal.type, google_calendar_id: cal.google_calendar_id },
      result.created_by
    );
    await Event.findByIdAndUpdate(result._id, {
      google_events: syncResult.google_events,
      sync_status: syncResult.sync_status,
    });
    (result as any).sync_status = syncResult.sync_status;
    (result as any).google_events = syncResult.google_events;
  }

  return toPlain(result);
}

export async function updateEvent(id: string, data: Record<string, unknown>) {
  await connect();
  const existing = await Event.findById(id).select('version google_events').lean({ virtuals: true }) as any;
  const updated = await Event.findByIdAndUpdate(
    id,
    { ...data, version: (existing?.version || 0) + 1, updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });
  if (!updated) return toPlain(null);

  const calendar = await Calendar.findById(updated.calendar_id).lean({ virtuals: true });
  const cal = calendar as any;
  if (cal?.google_calendar_id) {
    const syncResult = await syncEventToGoogle(
      {
        id: id.toString(),
        calendar_id: updated.calendar_id,
        title: updated.title,
        description: updated.description || null,
        location: updated.location || null,
        start_time: updated.start_time,
        end_time: updated.end_time,
        is_all_day: updated.is_all_day || false,
        google_events: existing?.google_events || [],
      },
      { type: cal.type, google_calendar_id: cal.google_calendar_id },
      updated.created_by
    );
    await Event.findByIdAndUpdate(id, {
      google_events: syncResult.google_events,
      sync_status: syncResult.sync_status,
    });
    (updated as any).sync_status = syncResult.sync_status;
    (updated as any).google_events = syncResult.google_events;
  }

  return toPlain(updated);
}

export async function deleteEvent(id: string) {
  await connect();
  const event = await Event.findById(id).select('calendar_id google_events').lean({ virtuals: true }) as any;
  if (!event) return toPlain(null);

  if (event.google_events?.length > 0) {
    const calendar = await Calendar.findById(event.calendar_id).lean({ virtuals: true }) as any;
    if (calendar?.google_calendar_id) {
      for (const ref of event.google_events) {
        try {
          await deleteGoogleEvent(ref.user_id, calendar.google_calendar_id, ref.google_event_id);
        } catch (err) {
          console.error(`Failed to delete Google event ${ref.google_event_id}:`, err);
        }
      }
    }
  }

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

  const { getClient, getSenderIdentity } = await import('@/lib/resend');
  const identity = await getSenderIdentity();
  let sent = 0;

  for (const reminder of reminders) {
    const r = reminder as any;
    const event = eventMap.get(r.event_id?.toString()) as any;

    if (r.method === 'email' && event?.created_by) {
      const { User } = await import('@/lib/db/models/core');
      const userData = await User.findById(event.created_by).select('email').lean({ virtuals: true });
      if ((userData as any)?.email) {
        try {
          await getClient().emails.send({
            from: `${identity.displayName} <${identity.email}>`,
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
