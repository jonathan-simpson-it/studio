import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  ticket_number: string;
  client_id: string | null;
  project_id: string | null;
  contact_email: string;
  contact_name: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source: string;
  tags: string[];
  assignee_ids: string[];
  created_task_id: string | null;
  created_issue_url: string | null;
  original_message: string | null;
  created_at: Date;
  updated_at: Date;
}

const ticketSchema = new Schema<ITicket>({
  ticket_number: { type: String, required: true, unique: true },
  client_id: { type: String, default: null },
  project_id: { type: String, default: null },
  contact_email: { type: String, required: true },
  contact_name: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  status: { type: String, default: 'Open' },
  priority: { type: String, default: 'Medium' },
  source: { type: String, default: 'support-form' },
  tags: [{ type: String }],
  assignee_ids: [{ type: String }],
  created_task_id: { type: String, default: null },
  created_issue_url: { type: String, default: null },
  original_message: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

ticketSchema.index({ contact_email: 1 });
ticketSchema.index({ client_id: 1 });
ticketSchema.index({ status: 1 });

export const Ticket = mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', ticketSchema);
