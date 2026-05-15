import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  title: string;
  body: string | null;
  author_id: string;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  visibility: string;
  created_at: Date;
  updated_at: Date;
}

const noteSchema = new Schema<INote>({
  title: { type: String, required: true },
  body: { type: String, default: null },
  author_id: { type: String, required: true },
  client_id: { type: String, default: null },
  project_id: { type: String, default: null },
  task_id: { type: String, default: null },
  visibility: { type: String, default: 'internal' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Note = mongoose.models.Note || mongoose.model<INote>('Note', noteSchema);

export interface IProposal extends Document {
  proposal_number: string;
  client_id: string;
  project_id: string | null;
  status: string;
  currency: string;
  line_items: Array<{
    service: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  discount_percent: number;
  subtotal: number;
  total: number;
  cover_note: string | null;
  scope_of_work: string | null;
  timeline: string | null;
  payment_terms: string | null;
  sent_at: Date | null;
  viewed_at: Date | null;
  accepted_at: Date | null;
  expires_at: Date | null;
  pdf_url: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const proposalSchema = new Schema<IProposal>({
  proposal_number: { type: String, required: true, unique: true },
  client_id: { type: String, required: true },
  project_id: { type: String, default: null },
  status: { type: String, default: 'Draft' },
  currency: { type: String, default: 'HKD' },
  line_items: [{ service: String, description: String, quantity: Number, unit_price: Number, total: Number }],
  discount_percent: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  cover_note: { type: String, default: null },
  scope_of_work: { type: String, default: null },
  timeline: { type: String, default: null },
  payment_terms: { type: String, default: null },
  sent_at: { type: Date, default: null },
  viewed_at: { type: Date, default: null },
  accepted_at: { type: Date, default: null },
  expires_at: { type: Date, default: null },
  pdf_url: { type: String, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Proposal = mongoose.models.Proposal || mongoose.model<IProposal>('Proposal', proposalSchema);

export interface IInvoice extends Document {
  invoice_number: string;
  client_id: string;
  project_id: string | null;
  status: string;
  currency: string;
  line_items: Array<{
    service: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  discount_percent: number;
  subtotal: number;
  tax_label: string | null;
  tax_percent: number;
  total: number;
  issue_date: Date;
  due_date: Date | null;
  payment_terms: string | null;
  payment_notes: string | null;
  paid_at: Date | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  next_issue_date: Date | null;
  source_proposal_id: string | null;
  pdf_url: string | null;
  sent_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const invoiceSchema = new Schema<IInvoice>({
  invoice_number: { type: String, required: true, unique: true },
  client_id: { type: String, required: true },
  project_id: { type: String, default: null },
  status: { type: String, default: 'Draft' },
  currency: { type: String, default: 'HKD' },
  line_items: [{ service: String, description: String, quantity: Number, unit_price: Number, total: Number }],
  discount_percent: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  tax_label: { type: String, default: null },
  tax_percent: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  issue_date: { type: Date, default: Date.now },
  due_date: { type: Date, default: null },
  payment_terms: { type: String, default: null },
  payment_notes: { type: String, default: null },
  paid_at: { type: Date, default: null },
  is_recurring: { type: Boolean, default: false },
  recurring_frequency: { type: String, default: null },
  next_issue_date: { type: Date, default: null },
  source_proposal_id: { type: String, default: null },
  pdf_url: { type: String, default: null },
  sent_at: { type: Date, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

invoiceSchema.index({ status: 1 });
invoiceSchema.index({ client_id: 1 });
invoiceSchema.index({ project_id: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);

export interface ICost extends Document {
  category: string;
  description: string | null;
  amount: number;
  currency: string;
  date: Date;
  client_id: string | null;
  project_id: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_by: string;
  created_at: Date;
}

const costSchema = new Schema<ICost>({
  category: { type: String, required: true },
  description: { type: String, default: null },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'HKD' },
  date: { type: Date, default: Date.now },
  client_id: { type: String, default: null },
  project_id: { type: String, default: null },
  is_recurring: { type: Boolean, default: false },
  recurring_frequency: { type: String, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const Cost = mongoose.models.Cost || mongoose.model<ICost>('Cost', costSchema);

export interface IFileRecord extends Document {
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: string;
  client_id: string | null;
  project_id: string | null;
  uploaded_by: string;
  created_at: Date;
}

const fileRecordSchema = new Schema<IFileRecord>({
  name: { type: String, required: true },
  storage_path: { type: String, required: true },
  mime_type: { type: String, default: null },
  size_bytes: { type: Number, default: null },
  visibility: { type: String, default: 'internal' },
  client_id: { type: String, default: null },
  project_id: { type: String, default: null },
  uploaded_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const FileRecord = mongoose.models.FileRecord || mongoose.model<IFileRecord>('FileRecord', fileRecordSchema);

export interface IEmailOutbox extends Document {
  user_id: string;
  from_email: string;
  to_email: string;
  to_name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  status: 'sent' | 'failed' | 'draft';
  resend_id: string | null;
  entity_type: 'invoice' | 'proposal' | 'general' | 'follow-up' | null;
  entity_id: string | null;
  attachment_ids: string[];
  error_message: string | null;
  sent_at: Date | null;
  created_at: Date;
}

const emailOutboxSchema = new Schema<IEmailOutbox>({
  user_id: { type: String, required: true },
  from_email: { type: String, required: true },
  to_email: { type: String, required: true },
  to_name: { type: String, default: '' },
  subject: { type: String, required: true },
  body_text: { type: String, default: '' },
  body_html: { type: String, default: null },
  status: { type: String, enum: ['sent', 'failed', 'draft'], default: 'draft' },
  resend_id: { type: String, default: null },
  entity_type: { type: String, enum: ['invoice', 'proposal', 'general', 'follow-up'], default: null },
  entity_id: { type: String, default: null },
  attachment_ids: [{ type: String }],
  error_message: { type: String, default: null },
  sent_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

emailOutboxSchema.index({ user_id: 1, sent_at: -1 });
emailOutboxSchema.index({ entity_type: 1, entity_id: 1 });

export const EmailOutbox = mongoose.models.EmailOutbox || mongoose.model<IEmailOutbox>('EmailOutbox', emailOutboxSchema);
