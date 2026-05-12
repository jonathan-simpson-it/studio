// ============================================================
// ENUMS / UNION TYPES
// ============================================================

export type LeadStage = 'New' | 'Contacted' | 'Discovery' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
export type ProjectStatus = 'Planning' | 'In Progress' | 'Waiting on Client' | 'Review' | 'Completed';
export type TaskStatus = 'Todo' | 'In Progress' | 'Bottlenecked' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ProposalStatus = 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
export type Currency = 'HKD' | 'GBP' | 'IDR';
export type BillingType = 'One-off' | 'Retainer' | 'Milestone' | 'Support';
export type CostCategory = 'Software' | 'API' | 'Contractor' | 'Domain' | 'Hosting' | 'Travel' | 'Other';
export type Visibility = 'internal' | 'private' | 'client-safe';
export type UserRole = 'founder' | 'client';
export type CalendarRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ReminderMethod = 'email' | 'push' | 'browser';
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly';
export type MilestoneStatus = 'Open' | 'In Progress' | 'Completed';
export type ApiKeyScope = 'read' | 'write' | 'full';

export type AIModelKey = 'default' | 'longform' | 'structured' | 'multilingual' | 'fast';

export type AIActionType =
  | 'generate-proposal'
  | 'generate-invoice'
  | 'generate-project-summary'
  | 'generate-monthly-report'
  | 'generate-audit'
  | 'generate-tool-documentation'
  | 'create-github-issue'
  | 'draft-email'
  | 'generate-follow-up-email'
  | 'generate-multilingual-email'
  | 'autofill-note'
  | 'autofill-task-description'
  | 'parse-event-nl'
  | 'summarize-calendar';

export type EventSourceType = 'task' | 'milestone' | 'invoice' | 'proposal' | 'github_issue';

// ============================================================
// ENTITY TYPES
// ============================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  timezone: string;
  default_hourly_rate: number;
  created_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  source: string | null;
  estimated_value: number;
  currency: Currency;
  services_interested: string[];
  stage: LeadStage;
  owner_id: string | null;
  heat_score?: number;
  next_action: string | null;
  next_action_date: string | null;
  stage_changed_at: string;
  last_contacted_at: string | null;
  notes: string | null;
  converted_at: string | null;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  billing_name: string | null;
  billing_address: string | null;
  services: string[];
  currency_preference: Currency;
  source_lead_id: string | null;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  billing_type: BillingType | null;
  status: ProjectStatus;
  owner_id: string | null;
  start_date: string;
  end_date: string | null;
  currency: Currency;
  budget: number | null;
  source_lead_id: string | null;
  source_proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRepo {
  id: string;
  project_id: string;
  github_repo_owner: string;
  github_repo_name: string;
  github_repo_url: string | null;
  full_name: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  client_id: string | null;
  milestone_id: string | null;
  assignee_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  est_hours: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SyncedGithubIssue {
  id: string;
  github_issue_id: number;
  repo_id: string;
  project_id: string;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  assignee_github_login: string | null;
  labels: Array<{ name: string; color: string }>;
  milestone_title: string | null;
  github_url: string | null;
  synced_at: string;
  created_at_github: string | null;
  updated_at_github: string | null;
}

export interface Note {
  id: string;
  title: string;
  body: string | null;
  author_id: string;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  proposal_number: string;
  client_id: string;
  project_id: string | null;
  status: ProposalStatus;
  currency: Currency;
  line_items: LineItem[];
  discount_percent: number;
  subtotal: number;
  total: number;
  cover_note: string | null;
  scope_of_work: string | null;
  timeline: string | null;
  payment_terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  pdf_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id: string | null;
  status: InvoiceStatus;
  currency: Currency;
  line_items: LineItem[];
  discount_percent: number;
  subtotal: number;
  tax_label: string | null;
  tax_percent: number;
  total: number;
  issue_date: string;
  due_date: string | null;
  payment_terms: string | null;
  payment_notes: string | null;
  paid_at: string | null;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  next_issue_date: string | null;
  source_proposal_id: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Cost {
  id: string;
  category: CostCategory;
  description: string | null;
  amount: number;
  currency: Currency;
  date: string;
  client_id: string | null;
  project_id: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_by: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: Visibility;
  client_id: string | null;
  project_id: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface AgencySettings {
  id: string;
  agency_name: string;
  agency_address: string;
  logo_url: string | null;
  default_currency: Currency;
  invoice_default_terms: string;
  proposal_default_terms: string;
  proposal_default_scope_template: string;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  service: 'github' | 'resend' | 'openrouter';
  encrypted_key: string;
  extra_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string | null;
  project_id: string | null;
  user_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  is_billable: boolean;
  hourly_rate: number | null;
  created_at: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  billing_type: BillingType | null;
  tasks: TemplateTask[];
  created_by: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scope: ApiKeyScope;
  is_active: boolean;
  created_by: string;
  last_used_at: string | null;
  created_at: string;
}

// ============================================================
// SHARED SUB-TYPES
// ============================================================

export interface LineItem {
  service: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface TemplateTask {
  title: string;
  description_md?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  milestone_label?: string;
  est_hours?: number;
}

// ============================================================
// AI ACTION TYPES
// ============================================================

export interface AIActionContext {
  action: AIActionType;
  scope?: 'agency' | 'project';
  [key: string]: unknown;
}

export interface HeatScoreInput {
  lead: Lead;
  mostRecentProposal?: Proposal | null;
}

// ============================================================
// ACTIVITY LOG META TYPES
// ============================================================

export interface ActivityMetaStageChanged {
  field: 'stage';
  old_value: string;
  new_value: string;
}

export interface ActivityMetaNoteAdded {
  note_id: string;
  note_title: string;
}

export interface ActivityMetaFileUploaded {
  file_name: string;
  visibility: Visibility;
  client_id?: string;
  project_id?: string;
}

export interface ActivityMetaInvoiceSent {
  invoice_number: string;
  amount: number;
  currency: Currency;
}

export interface ActivityMetaProposalSent {
  proposal_number: string;
  amount: number;
  currency: Currency;
}

export interface ActivityMetaConverted {
  client_id: string;
  project_id: string;
  lead_id: string;
}

export interface ActivityMetaPaid {
  invoice_number: string;
  paid_at: string;
}

// ============================================================
// CALENDAR TYPES
// ============================================================

export interface Calendar {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: CalendarRole;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  color: string | null;
  rrule: string | null;
  external_source_id: string | null;
  external_event_id: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  source_type?: EventSourceType;
  source_id?: string;
  source_url?: string;
}

export interface Reminder {
  id: string;
  event_id: string;
  trigger_at: string;
  method: ReminderMethod;
  is_sent: boolean;
  created_at: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface CalendarSource {
  id: string;
  calendar_id: string;
  url: string;
  last_sync: string | null;
  last_etag: string | null;
  sync_token: string | null;
  created_at: string;
}

export interface DailyExpense {
  id: string;
  calendar_id: string | null;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
}

export interface OcrTask {
  id: string;
  user_id: string;
  status: 'processing' | 'done' | 'failed';
  file_path: string | null;
  raw_text: string | null;
  parsed_json: unknown;
  created_at: string;
  updated_at: string;
}

export interface CalendarInvite {
  id: string;
  calendar_id: string;
  token: string;
  role: 'EDITOR' | 'VIEWER';
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

export interface CalendarShare {
  id: string;
  calendar_id: string;
  token: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}
