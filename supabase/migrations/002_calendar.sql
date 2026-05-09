-- Studio — Calendar module
-- Run this in Supabase SQL Editor

-- ============================================================
-- CALENDARS
-- ============================================================
CREATE TABLE calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_calendars" ON calendars
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CALENDAR MEMBERS (sharing with permissions)
-- ============================================================
CREATE TABLE calendar_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users NOT NULL,
  role text DEFAULT 'VIEWER' NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
  UNIQUE(calendar_id, user_id)
);

ALTER TABLE calendar_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_calendar_members" ON calendar_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false,
  color text,
  rrule text,
  external_source_id text,
  external_event_id text,
  version integer DEFAULT 1,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_events" ON events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE NOT NULL,
  trigger_at timestamptz NOT NULL,
  method text DEFAULT 'browser' NOT NULL CHECK (method IN ('email', 'push', 'browser')),
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_reminders" ON reminders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- EVENT COMMENTS
-- ============================================================
CREATE TABLE event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_event_comments" ON event_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CALENDAR SOURCES (external ICS feeds)
-- ============================================================
CREATE TABLE calendar_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  last_sync timestamptz,
  last_etag text,
  sync_token text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_calendar_sources" ON calendar_sources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- DAILY EXPENSES
-- ============================================================
CREATE TABLE daily_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE SET NULL,
  user_id uuid REFERENCES users NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_daily_expenses" ON daily_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- OCR TASKS
-- ============================================================
CREATE TABLE ocr_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  status text DEFAULT 'processing' NOT NULL CHECK (status IN ('processing', 'done', 'failed')),
  file_path text,
  raw_text text,
  parsed_json jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ocr_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_ocr_tasks" ON ocr_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CALENDAR INVITES
-- ============================================================
CREATE TABLE calendar_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  role text DEFAULT 'VIEWER' NOT NULL CHECK (role IN ('EDITOR', 'VIEWER')),
  expires_at timestamptz,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE calendar_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_calendar_invites" ON calendar_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- CALENDAR SHARES (public subscription URLs)
-- ============================================================
CREATE TABLE calendar_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES calendars ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_calendar_shares" ON calendar_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_events_calendar ON events(calendar_id);
CREATE INDEX idx_events_start ON events(start_time);
CREATE INDEX idx_events_end ON events(end_time);
CREATE INDEX idx_reminders_trigger ON reminders(trigger_at) WHERE is_sent = false;
CREATE INDEX idx_event_comments_event ON event_comments(event_id);
CREATE INDEX idx_daily_expenses_date ON daily_expenses(date);
CREATE INDEX idx_daily_expenses_user ON daily_expenses(user_id);
