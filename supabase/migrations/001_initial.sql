-- Studio — Complete schema, RLS policies, and seed data
-- Run this once in Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role text DEFAULT 'founder' NOT NULL CHECK (role IN ('founder', 'client')),
  timezone text DEFAULT 'Asia/Hong_Kong' NOT NULL,
  default_hourly_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text,
  social_links jsonb DEFAULT '{}'::jsonb,
  source text CHECK (source IN ('Referral', 'Inbound', 'Cold', 'Event', 'Other')),
  estimated_value numeric DEFAULT 0,
  currency text DEFAULT 'HKD' NOT NULL,
  services_interested text[] DEFAULT '{}',
  stage text DEFAULT 'New' NOT NULL CHECK (stage IN ('New', 'Contacted', 'Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost')),
  owner_id uuid REFERENCES users,
  next_action text,
  next_action_date date,
  stage_changed_at timestamptz DEFAULT now(),
  last_contacted_at timestamptz,
  notes text,
  converted_at timestamptz,
  converted_client_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_leads" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text,
  social_links jsonb DEFAULT '{}'::jsonb,
  billing_name text,
  billing_address text,
  services text[] DEFAULT '{}',
  currency_preference text DEFAULT 'HKD',
  source_lead_id uuid REFERENCES leads,
  is_internal boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_contacts" ON contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client_id uuid REFERENCES clients NOT NULL,
  billing_type text CHECK (billing_type IN ('One-off', 'Retainer', 'Milestone', 'Support')),
  status text DEFAULT 'Planning' NOT NULL CHECK (status IN ('Planning', 'In Progress', 'Waiting on Client', 'Review', 'Completed')),
  owner_id uuid REFERENCES users,
  start_date date DEFAULT CURRENT_DATE NOT NULL,
  end_date date,
  currency text DEFAULT 'HKD' NOT NULL,
  budget numeric,
  source_lead_id uuid REFERENCES leads,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- PROJECT REPOS
-- ============================================================
CREATE TABLE project_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  github_repo_owner text NOT NULL,
  github_repo_name text NOT NULL,
  github_repo_url text,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_project_repos" ON project_repos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- MILESTONES
-- ============================================================
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'Open' NOT NULL CHECK (status IN ('Open', 'In Progress', 'Completed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_milestones" ON milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  client_id uuid REFERENCES clients,
  milestone_id uuid REFERENCES milestones,
  assignee_id uuid REFERENCES users,
  priority text DEFAULT 'Medium' NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status text DEFAULT 'Todo' NOT NULL CHECK (status IN ('Todo', 'In Progress', 'Bottlenecked', 'Done')),
  due_date date,
  est_hours numeric,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_tasks" ON tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- SYNCED GITHUB ISSUES
-- ============================================================
CREATE TABLE synced_github_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_issue_id bigint NOT NULL,
  repo_id uuid REFERENCES project_repos ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text,
  state text NOT NULL CHECK (state IN ('open', 'closed')),
  assignee_github_login text,
  labels jsonb DEFAULT '[]'::jsonb,
  milestone_title text,
  github_url text,
  synced_at timestamptz DEFAULT now() NOT NULL,
  created_at_github timestamptz,
  updated_at_github timestamptz
);

ALTER TABLE synced_github_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_synced_github_issues" ON synced_github_issues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  author_id uuid REFERENCES users NOT NULL,
  client_id uuid REFERENCES clients,
  project_id uuid REFERENCES projects,
  task_id uuid REFERENCES tasks,
  visibility text DEFAULT 'internal' NOT NULL CHECK (visibility IN ('internal', 'private', 'client-safe')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_notes_internal" ON notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
    AND (visibility = 'internal' OR visibility = 'client-safe' OR (visibility = 'private' AND author_id = auth.uid()))
  );

CREATE POLICY "founders_all_notes_private" ON notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
    AND (visibility = 'private' AND author_id = auth.uid())
  );

-- ============================================================
-- PROPOSALS
-- ============================================================
CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients NOT NULL,
  project_id uuid REFERENCES projects,
  status text DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired')),
  currency text DEFAULT 'HKD' NOT NULL,
  line_items jsonb DEFAULT '[]'::jsonb,
  discount_percent numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  total numeric DEFAULT 0,
  cover_note text,
  scope_of_work text,
  timeline text,
  payment_terms text,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  pdf_url text,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_proposals" ON proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

ALTER TABLE projects
  ADD COLUMN source_proposal_id uuid REFERENCES proposals;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients NOT NULL,
  project_id uuid REFERENCES projects,
  status text DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  currency text NOT NULL CHECK (currency IN ('HKD', 'GBP', 'IDR')),
  line_items jsonb DEFAULT '[]'::jsonb,
  discount_percent numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  tax_label text,
  tax_percent numeric DEFAULT 0,
  total numeric DEFAULT 0,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text,
  payment_notes text,
  paid_at timestamptz,
  is_recurring boolean DEFAULT false,
  recurring_frequency text CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly')),
  next_issue_date date,
  source_proposal_id uuid REFERENCES proposals,
  pdf_url text,
  sent_at timestamptz,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- COSTS
-- ============================================================
CREATE TABLE costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('Software', 'API', 'Contractor', 'Domain', 'Hosting', 'Travel', 'Other')),
  description text,
  amount numeric NOT NULL,
  currency text DEFAULT 'HKD' NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  client_id uuid REFERENCES clients,
  project_id uuid REFERENCES projects,
  is_recurring boolean DEFAULT false,
  recurring_frequency text,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_costs" ON costs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- FILES
-- ============================================================
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  visibility text DEFAULT 'internal' NOT NULL CHECK (visibility IN ('internal', 'client-safe', 'private')),
  client_id uuid REFERENCES clients,
  project_id uuid REFERENCES projects,
  uploaded_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_files" ON files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES users NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_activity_log" ON activity_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- AGENCY SETTINGS (single row)
-- ============================================================
CREATE TABLE agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text DEFAULT 'Jonathon Simpson & Co.' NOT NULL,
  agency_address text DEFAULT '' NOT NULL,
  logo_url text,
  default_currency text DEFAULT 'HKD' NOT NULL,
  invoice_default_terms text DEFAULT '' NOT NULL,
  proposal_default_terms text DEFAULT '' NOT NULL,
  proposal_default_scope_template text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_agency_settings" ON agency_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- INTEGRATIONS (encrypted API keys per service)
-- ============================================================
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text UNIQUE NOT NULL CHECK (service IN ('github', 'resend', 'openrouter')),
  encrypted_key text NOT NULL,
  extra_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_integrations" ON integrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- DOC NUMBER SEQUENCES
-- ============================================================
CREATE TABLE doc_number_sequences (
  entity_type text NOT NULL CHECK (entity_type IN ('invoice', 'proposal')),
  year integer NOT NULL,
  sequence integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (entity_type, year)
);

ALTER TABLE doc_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_doc_number_sequences" ON doc_number_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- TIME ENTRIES
-- ============================================================
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks ON DELETE SET NULL,
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  user_id uuid REFERENCES users NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  description text,
  is_billable boolean DEFAULT true NOT NULL,
  hourly_rate numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT time_entry_has_target CHECK (task_id IS NOT NULL OR project_id IS NOT NULL)
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_time_entries" ON time_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- PROJECT TEMPLATES
-- ============================================================
CREATE TABLE project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  billing_type text CHECK (billing_type IN ('One-off', 'Retainer', 'Milestone', 'Support')),
  tasks jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_project_templates" ON project_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- API KEYS (for agent integrations)
-- ============================================================
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  scope text DEFAULT 'read' NOT NULL CHECK (scope IN ('read', 'write', 'full')),
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES users NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_api_keys" ON api_keys
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- SEED DATA
-- ============================================================

-- Internal JSCo client (required infrastructure)
INSERT INTO clients (id, company_name, contact_name, email, is_internal)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Jonathon Simpson & Co.',
  'Lewis Simpson',
  'lewis@jonathansimpson.co',
  true
);

-- Founders must be added manually after creating auth accounts:
-- INSERT INTO users (email, full_name, role) VALUES ('lewis@jonathansimpson.co', 'Lewis Simpson', 'founder');
-- INSERT INTO users (email, full_name, role) VALUES ('devano@jonathansimpson.co', 'Devano Jonathon', 'founder');

-- Default agency settings
INSERT INTO agency_settings (id, agency_name, agency_address, default_currency, invoice_default_terms, proposal_default_terms)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Jonathon Simpson & Co.',
  '',
  'HKD',
  'Payment due within 30 days of issue date.',
  'Payment terms: 50% upfront, 50% on completion.'
);

-- Seed doc_number_sequences
INSERT INTO doc_number_sequences (entity_type, year, sequence) VALUES
  ('invoice', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0),
  ('proposal', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0);

-- ============================================================
-- FUTURE CLIENT POLICIES (commented out, schema-ready)
-- ============================================================

-- CREATE POLICY "client_select_own" ON projects
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
--       AND client_id = projects.client_id
--     )
--   );

-- CREATE POLICY "client_select_client_safe_files" ON files
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
--       AND files.client_id = users.client_id
--       AND files.visibility = 'client-safe'
--     )
--   );

-- CREATE POLICY "client_select_client_safe_notes" ON notes
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
--       AND notes.client_id = users.client_id
--       AND notes.visibility IN ('internal', 'client-safe')
--     )
--   );

-- CREATE POLICY "client_select_own_invoices" ON invoices
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
--       AND invoices.client_id = users.client_id
--     )
--   );

-- CREATE POLICY "client_select_own_proposals" ON proposals
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
--       AND proposals.client_id = users.client_id
--     )
--   );
