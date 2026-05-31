import mongoose, { Schema, Document } from 'mongoose';

export interface IGoogleCalendarSync extends Document {
  user_id: string;
  google_calendar_id: string;
  name: string;
  color: string;
  is_active: boolean;
  last_synced_at: Date | null;
  created_at: Date;
}

const googleCalendarSyncSchema = new Schema<IGoogleCalendarSync>({
  user_id: { type: String, required: true },
  google_calendar_id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
  is_active: { type: Boolean, default: true },
  last_synced_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

googleCalendarSyncSchema.index({ user_id: 1, google_calendar_id: 1 }, { unique: true });

export const GoogleCalendarSync = mongoose.models.GoogleCalendarSync || mongoose.model<IGoogleCalendarSync>('GoogleCalendarSync', googleCalendarSyncSchema);

export interface IGoogleInbox extends Document {
  user_id: string;
  label_id: string;
  name: string;
  is_active: boolean;
  last_synced_at: Date | null;
  created_at: Date;
}

const googleInboxSchema = new Schema<IGoogleInbox>({
  user_id: { type: String, required: true },
  label_id: { type: String, required: true },
  name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  last_synced_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

googleInboxSchema.index({ user_id: 1, label_id: 1 }, { unique: true });

export const GoogleInbox = mongoose.models.GoogleInbox || mongoose.model<IGoogleInbox>('GoogleInbox', googleInboxSchema);

export type MessageImportance = 'high' | 'medium' | 'low';

export interface IInboxMessage extends Document {
  user_id: string;
  google_message_id: string;
  thread_id: string;
  label_id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  body_plain: string;
  body_html: string;
  ai_summary: string;
  importance: MessageImportance;
  action_needed: boolean;
  action_description: string | null;
  is_read: boolean;
  is_archived: boolean;
  received_at: Date;
  created_at: Date;
}

const inboxMessageSchema = new Schema<IInboxMessage>({
  user_id: { type: String, required: true },
  google_message_id: { type: String, required: true, unique: true },
  thread_id: { type: String, required: true },
  label_id: { type: String, default: null },
  from_name: { type: String, default: '' },
  from_email: { type: String, required: true },
  subject: { type: String, default: '' },
  snippet: { type: String, default: '' },
  body_plain: { type: String, default: '' },
  body_html: { type: String, default: '' },
  ai_summary: { type: String, default: '' },
  importance: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  action_needed: { type: Boolean, default: false },
  action_description: { type: String, default: null },
  is_read: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
  received_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

inboxMessageSchema.index({ user_id: 1, received_at: -1 });
inboxMessageSchema.index({ user_id: 1, is_archived: 1, received_at: -1 });

export const InboxMessage = mongoose.models.InboxMessage || mongoose.model<IInboxMessage>('InboxMessage', inboxMessageSchema);
