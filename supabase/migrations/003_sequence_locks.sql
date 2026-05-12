-- 003: Lead deduplication, sequence lock functions, and calendar cron updates

-- ============================================================
-- LEAD DEDUPLICATION
-- ============================================================
-- Deduplicate existing leads first (keep the most recent for each email)
DELETE FROM activity_log WHERE entity_type = 'lead' AND entity_id IN (
  SELECT id FROM (
    SELECT id, email, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
    FROM leads WHERE email IS NOT NULL
  ) dup WHERE dup.rn > 1
);

DELETE FROM leads WHERE id IN (
  SELECT id FROM (
    SELECT id, email, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
    FROM leads WHERE email IS NOT NULL
  ) dup WHERE dup.rn > 1
);

-- Then add the constraint
ALTER TABLE leads ADD CONSTRAINT leads_email_unique UNIQUE (email);

-- ============================================================
-- SEQUENCE LOCK FUNCTIONS (for invoice number race condition)
-- ============================================================
CREATE OR REPLACE FUNCTION lock_and_get_sequence(entity text, yr integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  seq integer;
BEGIN
  INSERT INTO doc_number_sequences (entity_type, year, sequence)
  VALUES (entity, yr, 0)
  ON CONFLICT (entity_type, year) DO NOTHING;

  SELECT sequence INTO seq
  FROM doc_number_sequences
  WHERE entity_type = entity AND year = yr
  FOR UPDATE;

  RETURN seq;
END;
$$;

CREATE OR REPLACE FUNCTION update_sequence(entity text, yr integer, seq integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE doc_number_sequences
  SET sequence = seq
  WHERE entity_type = entity AND year = yr;
END;
$$;
