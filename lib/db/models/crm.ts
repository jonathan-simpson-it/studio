import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  source: string | null;
  estimated_value: number;
  currency: string;
  services_interested: string[];
  stage: string;
  owner_id: string | null;
  heat_score?: number;
  next_action: string | null;
  next_action_date: string | null;
  stage_changed_at: Date;
  last_contacted_at: Date | null;
  notes: string | null;
  converted_at: Date | null;
  converted_client_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const leadSchema = new Schema<ILead>({
  company_name: { type: String, required: true },
  contact_name: { type: String, required: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  social_links: { type: Schema.Types.Mixed, default: {} },
  source: { type: String, default: null },
  estimated_value: { type: Number, default: 0 },
  currency: { type: String, default: 'HKD' },
  services_interested: [{ type: String }],
  stage: { type: String, default: 'New' },
  owner_id: { type: String, default: null },
  heat_score: { type: Number, default: undefined },
  next_action: { type: String, default: null },
  next_action_date: { type: String, default: null },
  stage_changed_at: { type: Date, default: Date.now },
  last_contacted_at: { type: Date, default: null },
  notes: { type: String, default: null },
  converted_at: { type: Date, default: null },
  converted_client_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

leadSchema.index({ stage: 1 });

export const Lead = mongoose.models.Lead || mongoose.model<ILead>('Lead', leadSchema);

export interface IClient extends Document {
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  billing_name: string | null;
  billing_address: string | null;
  services: string[];
  currency_preference: string;
  source_lead_id: string | null;
  is_internal: boolean;
  created_at: Date;
  updated_at: Date;
}

const clientSchema = new Schema<IClient>({
  company_name: { type: String, required: true },
  contact_name: { type: String, required: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  social_links: { type: Schema.Types.Mixed, default: {} },
  billing_name: { type: String, default: null },
  billing_address: { type: String, default: null },
  services: [{ type: String }],
  currency_preference: { type: String, default: 'HKD' },
  source_lead_id: { type: String, default: null },
  is_internal: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Client = mongoose.models.Client || mongoose.model<IClient>('Client', clientSchema);

export interface IContact extends Document {
  client_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: Date;
}

const contactSchema = new Schema<IContact>({
  client_id: { type: String, required: true },
  full_name: { type: String, required: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  role: { type: String, default: null },
  is_primary: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export const Contact = mongoose.models.Contact || mongoose.model<IContact>('Contact', contactSchema);

export interface IActivityLog extends Document {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  meta: Record<string, unknown>;
  created_at: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  entity_type: { type: String, required: true },
  entity_id: { type: String, required: true },
  action: { type: String, required: true },
  actor_id: { type: String, required: true },
  meta: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
});

activityLogSchema.index({ entity_id: 1, created_at: -1 });

export const ActivityLog = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
