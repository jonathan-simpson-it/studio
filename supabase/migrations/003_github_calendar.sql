-- Add calendar-related columns to synced_github_issues
-- for surfacing GitHub milestone deadlines on the calendar

ALTER TABLE synced_github_issues ADD COLUMN IF NOT EXISTS milestone_due_on timestamptz;
ALTER TABLE synced_github_issues ADD COLUMN IF NOT EXISTS assignee_avatar_url text;
