-- Migration: Add location support to daily stock taking tables
-- Fixes 500 error when submitting per-location (Bar A / Bar B) stock takes

-- 1. Add location_id to daily_stock_sessions
ALTER TABLE daily_stock_sessions
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 2. Add reason column to daily_stock_items (referenced in submit endpoint)
ALTER TABLE daily_stock_items
    ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Drop old unique index that blocks multiple locations submitting on same date
DROP INDEX IF EXISTS idx_daily_stock_sessions_date_type;

-- 4. Create new unique index that differentiates by location
--    Uses COALESCE so global sessions (NULL location_id) also stay unique per date+type
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stock_sessions_date_type_loc
    ON daily_stock_sessions(session_date, session_type, COALESCE(location_id::text, ''));
