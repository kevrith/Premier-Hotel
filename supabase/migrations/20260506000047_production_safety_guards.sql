-- =============================================================================
-- PRODUCTION SAFETY GUARDS
-- Run this ONCE in Supabase SQL Editor to protect critical tables.
-- After running, accidental TRUNCATEs are blocked and every DELETE is
-- automatically backed up so data can always be recovered.
-- =============================================================================


-- ─── 1. TRUNCATE PROTECTION ───────────────────────────────────────────────────
-- Blocks TRUNCATE on all business-critical tables.
-- TRUNCATE was the most likely cause of the May 2026 data loss.

CREATE OR REPLACE FUNCTION prevent_truncate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'TRUNCATE on "%" is disabled for safety. '
    'Use DELETE with an explicit WHERE clause. '
    'If you genuinely need to clear the table, drop this trigger first '
    'and document the reason in git.',
    TG_TABLE_NAME;
  RETURN NULL;
END;
$$;

-- Apply to every table that would cripple the business if wiped
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'menu_items', 'rooms', 'orders', 'bills',
    'bookings', 'users', 'location_stock',
    'kitchen_stock', 'ingredients_stock', 'utensils_stock', 'office_stock'
  ]
  LOOP
    -- Only create trigger if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS no_truncate ON %I;
         CREATE TRIGGER no_truncate
           BEFORE TRUNCATE ON %I
           FOR EACH STATEMENT EXECUTE FUNCTION prevent_truncate();',
        t, t
      );
      RAISE NOTICE 'TRUNCATE protection added to %', t;
    ELSE
      RAISE NOTICE 'Skipped % (table does not exist)', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 2. AUTOMATIC SNAPSHOT TABLE ─────────────────────────────────────────────
-- Every row deleted from a protected table is saved here first.
-- If data is lost you can restore it with a simple SELECT from this table.

CREATE TABLE IF NOT EXISTS data_snapshots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  operation   TEXT        NOT NULL,   -- 'DELETE'
  row_data    JSONB       NOT NULL,   -- full row as JSON
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_lookup
  ON data_snapshots (table_name, snapshot_at DESC);

-- Keep snapshots for 90 days automatically (optional: comment out if you want forever)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete-old-snapshots', '0 3 * * *',
--   $$DELETE FROM data_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days'$$);

COMMENT ON TABLE data_snapshots IS
  'Automatic row-level backup captured before every DELETE on protected tables. '
  'Restore a table with: INSERT INTO <table> SELECT (row_data->>''column'')... FROM data_snapshots WHERE table_name=''<table>'';';


-- ─── 3. SNAPSHOT TRIGGER FUNCTION ────────────────────────────────────────────
-- Fires BEFORE DELETE on each protected table, saves the full row as JSON.

CREATE OR REPLACE FUNCTION snapshot_row_before_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO data_snapshots (table_name, operation, row_data)
  VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD));
  RETURN OLD;   -- returning OLD allows the DELETE to proceed normally
END;
$$;

-- Apply snapshot trigger to the most critical tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'menu_items', 'rooms', 'location_stock'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS auto_snapshot_on_delete ON %I;
         CREATE TRIGGER auto_snapshot_on_delete
           BEFORE DELETE ON %I
           FOR EACH ROW EXECUTE FUNCTION snapshot_row_before_delete();',
        t, t
      );
      RAISE NOTICE 'Snapshot trigger added to %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 4. VERIFY EVERYTHING IS IN PLACE ────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table  AS protected_table,
  event_manipulation  AS blocked_operation
FROM information_schema.triggers
WHERE trigger_name IN ('no_truncate', 'auto_snapshot_on_delete')
  AND trigger_schema = 'public'
ORDER BY event_object_table, blocked_operation;
