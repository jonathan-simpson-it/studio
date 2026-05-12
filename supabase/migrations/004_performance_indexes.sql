-- Performance indexes for dashboard and list page queries
-- Run: npx supabase db push

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

CREATE INDEX IF NOT EXISTS idx_milestones_status_due ON milestones(status, due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id_created ON activity_log(entity_id, created_at DESC);
