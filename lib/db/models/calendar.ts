import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendar extends Document {
  name: string;
  color: string;
  type: string;
  is_default: boolean;
  sync_to_google: boolean;
  google_calendar_id: string | null;
  created_by: string;
  created_at: Date;
}

const calendarSchema = new Schema<ICalendar>({
  name: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
  type: { type: String, default: 'personal' },
  is_default: { type: Boolean, default: false },
  sync_to_google: { type: Boolean, default: false },
  google_calendar_id: { type: String, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const Calendar = mongoose.models.Calendar || mongoose.model<ICalendar>('Calendar', calendarSchema);

export interface ICalendarMember extends Document {
  calendar_id: string;
  user_id: string;
  role: string;
}

const calendarMemberSchema = new Schema<ICalendarMember>({
  calendar_id: { type: String, required: true },
  user_id: { type: String, required: true },
  role: { type: String, default: 'VIEWER' },
});

calendarMemberSchema.index({ calendar_id: 1, user_id: 1 }, { unique: true });

export const CalendarMember = mongoose.models.CalendarMember || mongoose.model<ICalendarMember>('CalendarMember', calendarMemberSchema);

export interface IGoogleEventRef {
  user_id: string;
  google_event_id: string;
}

export interface IEvent extends Document {
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: Date;
  end_time: Date;
  is_all_day: boolean;
  color: string | null;
  rrule: string | null;
  external_source_id: string | null;
  external_event_id: string | null;
  version: number;
  google_events: IGoogleEventRef[];
  sync_status: 'synced' | 'pending' | 'failed';
  sync_retry_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const googleEventRefSchema = new Schema<IGoogleEventRef>({
  user_id: { type: String, required: true },
  google_event_id: { type: String, required: true },
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  calendar_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  location: { type: String, default: null },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  is_all_day: { type: Boolean, default: false },
  color: { type: String, default: null },
  rrule: { type: String, default: null },
  external_source_id: { type: String, default: null },
  external_event_id: { type: String, default: null },
  version: { type: Number, default: 1 },
  google_events: { type: [googleEventRefSchema], default: [] },
  sync_status: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced' },
  sync_retry_count: { type: Number, default: 0 },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema);

export interface IReminder extends Document {
  event_id: string;
  trigger_at: Date;
  method: string;
  is_sent: boolean;
  created_at: Date;
}

const reminderSchema = new Schema<IReminder>({
  event_id: { type: String, required: true },
  trigger_at: { type: Date, required: true },
  method: { type: String, default: 'email' },
  is_sent: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export const Reminder = mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', reminderSchema);

export interface IEventComment extends Document {
  event_id: string;
  user_id: string;
  text: string;
  created_at: Date;
}

const eventCommentSchema = new Schema<IEventComment>({
  event_id: { type: String, required: true },
  user_id: { type: String, required: true },
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const EventComment = mongoose.models.EventComment || mongoose.model<IEventComment>('EventComment', eventCommentSchema);

export interface ICalendarSource extends Document {
  calendar_id: string;
  url: string;
  last_sync: Date | null;
  last_etag: string | null;
  sync_token: string | null;
  created_at: Date;
}

const calendarSourceSchema = new Schema<ICalendarSource>({
  calendar_id: { type: String, required: true },
  url: { type: String, required: true },
  last_sync: { type: Date, default: null },
  last_etag: { type: String, default: null },
  sync_token: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

export const CalendarSource = mongoose.models.CalendarSource || mongoose.model<ICalendarSource>('CalendarSource', calendarSourceSchema);

export interface IDailyExpense extends Document {
  calendar_id: string | null;
  user_id: string;
  date: Date;
  amount: number;
  category: string;
  note: string | null;
  created_at: Date;
}

const dailyExpenseSchema = new Schema<IDailyExpense>({
  calendar_id: { type: String, default: null },
  user_id: { type: String, required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'General' },
  note: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

export const DailyExpense = mongoose.models.DailyExpense || mongoose.model<IDailyExpense>('DailyExpense', dailyExpenseSchema);

export interface IOcrTask extends Document {
  user_id: string;
  status: string;
  file_path: string | null;
  raw_text: string | null;
  parsed_json: unknown;
  created_at: Date;
  updated_at: Date;
}

const ocrTaskSchema = new Schema<IOcrTask>({
  user_id: { type: String, required: true },
  status: { type: String, default: 'processing' },
  file_path: { type: String, default: null },
  raw_text: { type: String, default: null },
  parsed_json: { type: Schema.Types.Mixed, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const OcrTask = mongoose.models.OcrTask || mongoose.model<IOcrTask>('OcrTask', ocrTaskSchema);

export interface ICalendarInvite extends Document {
  calendar_id: string;
  token: string;
  role: string;
  expires_at: Date | null;
  created_by: string;
  created_at: Date;
}

const calendarInviteSchema = new Schema<ICalendarInvite>({
  calendar_id: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  role: { type: String, default: 'VIEWER' },
  expires_at: { type: Date, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const CalendarInvite = mongoose.models.CalendarInvite || mongoose.model<ICalendarInvite>('CalendarInvite', calendarInviteSchema);

export interface ICalendarShare extends Document {
  calendar_id: string;
  token: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
}

const calendarShareSchema = new Schema<ICalendarShare>({
  calendar_id: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  is_active: { type: Boolean, default: true },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const CalendarShare = mongoose.models.CalendarShare || mongoose.model<ICalendarShare>('CalendarShare', calendarShareSchema);
