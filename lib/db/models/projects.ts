import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string | null;
  client_id: string;
  billing_type: string | null;
  status: string;
  owner_id: string | null;
  start_date: Date;
  end_date: Date | null;
  currency: string;
  budget: number | null;
  source_lead_id: string | null;
  source_proposal_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, default: null },
  client_id: { type: String, required: true },
  billing_type: { type: String, default: null },
  status: { type: String, default: 'Planning' },
  owner_id: { type: String, default: null },
  start_date: { type: Date, default: Date.now },
  end_date: { type: Date, default: null },
  currency: { type: String, default: 'HKD' },
  budget: { type: Number, default: null },
  source_lead_id: { type: String, default: null },
  source_proposal_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

projectSchema.index({ status: 1 });
projectSchema.index({ client_id: 1 });

export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);

export interface IProjectRepo extends Document {
  project_id: string;
  github_repo_owner: string;
  github_repo_name: string;
  github_repo_url: string | null;
  full_name: string;
  created_at: Date;
}

const projectRepoSchema = new Schema<IProjectRepo>({
  project_id: { type: String, required: true },
  github_repo_owner: { type: String, required: true },
  github_repo_name: { type: String, required: true },
  github_repo_url: { type: String, default: null },
  full_name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const ProjectRepo = mongoose.models.ProjectRepo || mongoose.model<IProjectRepo>('ProjectRepo', projectRepoSchema);

export interface IMilestone extends Document {
  project_id: string;
  title: string;
  description: string | null;
  due_date: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  project_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  due_date: { type: Date, default: null },
  status: { type: String, default: 'Open' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

milestoneSchema.index({ project_id: 1 });
milestoneSchema.index({ status: 1, due_date: 1 });

export const Milestone = mongoose.models.Milestone || mongoose.model<IMilestone>('Milestone', milestoneSchema);

export interface ITask extends Document {
  title: string;
  description: string | null;
  project_id: string | null;
  client_id: string | null;
  milestone_id: string | null;
  assignee_id: string | null;
  priority: string;
  status: string;
  due_date: Date | null;
  est_hours: number | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String, default: null },
  project_id: { type: String, default: null },
  client_id: { type: String, default: null },
  milestone_id: { type: String, default: null },
  assignee_id: { type: String, default: null },
  priority: { type: String, default: 'Medium' },
  status: { type: String, default: 'Todo' },
  due_date: { type: Date, default: null },
  est_hours: { type: Number, default: null },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

taskSchema.index({ assignee_id: 1, status: 1 });
taskSchema.index({ project_id: 1 });
taskSchema.index({ status: 1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);

export interface ISyncedGithubIssue extends Document {
  github_issue_id: number;
  repo_id: string;
  project_id: string;
  title: string;
  body: string | null;
  state: string;
  assignee_github_login: string | null;
  labels: Array<{ name: string; color: string }>;
  milestone_title: string | null;
  github_url: string | null;
  synced_at: Date;
  created_at_github: Date | null;
  updated_at_github: Date | null;
}

const syncedGithubIssueSchema = new Schema<ISyncedGithubIssue>({
  github_issue_id: { type: Number, required: true, unique: true },
  repo_id: { type: String, required: true },
  project_id: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: null },
  state: { type: String, default: 'open' },
  assignee_github_login: { type: String, default: null },
  labels: [{ name: String, color: String }],
  milestone_title: { type: String, default: null },
  github_url: { type: String, default: null },
  synced_at: { type: Date, default: Date.now },
  created_at_github: { type: Date, default: null },
  updated_at_github: { type: Date, default: null },
});

export const SyncedGithubIssue = mongoose.models.SyncedGithubIssue || mongoose.model<ISyncedGithubIssue>('SyncedGithubIssue', syncedGithubIssueSchema);
