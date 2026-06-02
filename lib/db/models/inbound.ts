import mongoose, { Schema, Document } from 'mongoose';

export interface IInboundMessage extends Document {
  user_id: string;
  to_email: string;
  from_email: string;
  from_name: string;
  subject: string;
  body_plain: string;
  body_html: string | null;
  is_read: boolean;
  is_archived: boolean;
  received_at: Date;
  created_at: Date;
}

const inboundMessageSchema = new Schema<IInboundMessage>({
  user_id: { type: String, required: true, index: true },
  to_email: { type: String, required: true },
  from_email: { type: String, required: true },
  from_name: { type: String, default: '' },
  subject: { type: String, default: '' },
  body_plain: { type: String, default: '' },
  body_html: { type: String, default: null },
  is_read: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
  received_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

inboundMessageSchema.index({ user_id: 1, received_at: -1 });
inboundMessageSchema.index({ user_id: 1, is_archived: 1, received_at: -1 });

export const InboundMessage = mongoose.models.InboundMessage || mongoose.model<IInboundMessage>('InboundMessage', inboundMessageSchema);
