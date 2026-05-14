import mongoose, { Schema, Document } from 'mongoose';

export interface IDocNumberSequence extends Document {
  entity_type: string;
  year: number;
  sequence: number;
}

const docNumberSequenceSchema = new Schema<IDocNumberSequence>({
  entity_type: { type: String, required: true },
  year: { type: Number, required: true },
  sequence: { type: Number, default: 1 },
});

docNumberSequenceSchema.index({ entity_type: 1, year: 1 }, { unique: true });

export const DocNumberSequence = mongoose.models.DocNumberSequence || mongoose.model<IDocNumberSequence>('DocNumberSequence', docNumberSequenceSchema);

export interface ITimeEntry extends Document {
  task_id: string | null;
  project_id: string | null;
  user_id: string;
  start_time: Date;
  end_time: Date | null;
  description: string | null;
  is_billable: boolean;
  hourly_rate: number | null;
  created_at: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>({
  task_id: { type: String, default: null },
  project_id: { type: String, default: null },
  user_id: { type: String, required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, default: null },
  description: { type: String, default: null },
  is_billable: { type: Boolean, default: true },
  hourly_rate: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
});

export const TimeEntry = mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema);

export interface IProjectTemplate extends Document {
  name: string;
  description: string | null;
  billing_type: string | null;
  tasks: Array<{
    title: string;
    description_md?: string;
    priority?: string;
    status?: string;
    milestone_label?: string;
    est_hours?: number;
  }>;
  created_by: string;
  created_at: Date;
}

const projectTemplateSchema = new Schema<IProjectTemplate>({
  name: { type: String, required: true },
  description: { type: String, default: null },
  billing_type: { type: String, default: null },
  tasks: [{ title: String, description_md: String, priority: String, status: String, milestone_label: String, est_hours: Number }],
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const ProjectTemplate = mongoose.models.ProjectTemplate || mongoose.model<IProjectTemplate>('ProjectTemplate', projectTemplateSchema);

export interface IInviteCode extends Document {
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: Date | null;
  created_at: Date;
}

const inviteCodeSchema = new Schema<IInviteCode>({
  code: { type: String, required: true, unique: true },
  is_used: { type: Boolean, default: false },
  used_by: { type: String, default: null },
  used_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

export const InviteCode = mongoose.models.InviteCode || mongoose.model<IInviteCode>('InviteCode', inviteCodeSchema);
