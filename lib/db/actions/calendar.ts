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
  return Event.find().sort({ start_time: 1 }).lean({ virtuals: true });
}

export async function ensureDefaultCalendar(userId: string) {
  await connect();
  let cal = await Calendar.findOne().sort({ created_at: 1 }).lean({ virtuals: true });
  if (!cal) {
    const created = await Calendar.create({ name: 'Personal', color: '#3b82f6', is_default: true, created_by: userId });
    await CalendarMember.create({ calendar_id: created._id.toString(), user_id: userId, role: 'OWNER' });
    cal = created.toObject({ virtuals: true });
  }
  return cal;
}

export async function createCalendar(data: Record<string, unknown>) {
  await connect();
  return Calendar.create(data);
}

export async function updateCalendar(id: string, data: Record<string, unknown>) {
  await connect();
  return Calendar.findByIdAndUpdate(id, data, { new: true }).lean({ virtuals: true });
}

export async function deleteCalendar(id: string) {
  await connect();
  await CalendarMember.deleteMany({ calendar_id: id });
  return Calendar.findByIdAndDelete(id).lean({ virtuals: true });
}

export async function getCalendarMembers(calendarId: string) {
  await connect();
  return CalendarMember.find({ calendar_id: calendarId }).lean({ virtuals: true });
}

export async function addCalendarMember(data: Record<string, unknown>) {
  await connect();
  return CalendarMember.create(data);
}

export async function getEvents(start: Date, end: Date) {
  await connect();
  return Event.find({
    start_time: { $lte: end },
    end_time: { $gte: start },
  }).sort({ start_time: 1 }).lean({ virtuals: true });
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
  return event.toObject({ virtuals: true });
}

export async function updateEvent(id: string, data: Record<string, unknown>) {
  await connect();
  return Event.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { new: true }).lean({ virtuals: true });
}

export async function deleteEvent(id: string) {
  await connect();
  return Event.findByIdAndDelete(id).lean({ virtuals: true });
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
  return Event.find(filter).lean({ virtuals: true });
}

// Reminders
export async function getPendingReminders() {
  await connect();
  const reminders = await Reminder.find({ is_sent: false, trigger_at: { $lte: new Date() } })
    .limit(50).sort({ trigger_at: 1 }).lean({ virtuals: true });

  const eventIds = [...new Set(reminders.map((r: any) => r.event_id))];
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('title start_time calendar_id created_by').lean({ virtuals: true });
  const eventMap = new Map(events.map((e: any) => [e._id.toString(), e]));

  return reminders.map((r: any) => ({
    ...r,
    event: eventMap.get(r.event_id?.toString()) || null,
  }));
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
  return DailyExpense.create(data);
}

export async function deleteDailyExpense(id: string) {
  await connect();
  return DailyExpense.findByIdAndDelete(id).lean({ virtuals: true });
}

export async function updateDailyExpense(id: string, data: Record<string, unknown>) {
  await connect();
  return DailyExpense.findByIdAndUpdate(id, data, { new: true }).lean({ virtuals: true });
}
