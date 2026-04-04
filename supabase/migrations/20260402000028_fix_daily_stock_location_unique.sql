-- Fix daily_stock_sessions unique constraint to allow separate sessions per location
-- Without this, Bar A and Bar B cannot both submit on the same day (unique index collision)

-- Drop the old index that only differentiates by (date, session_type)
DROP INDEX IF EXISTS idx_daily_stock_sessions_date_type;

-- New index: each location gets its own session per date+type
-- COALESCE maps NULL location_id (global sessions) to '' so they stay unique too
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stock_sessions_date_type_loc
    ON daily_stock_sessions(session_date, session_type, COALESCE(location_id::text, ''));
