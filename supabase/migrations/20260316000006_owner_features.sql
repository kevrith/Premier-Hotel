-- Branch revenue budgets for Budget vs Actual tracking
CREATE TABLE IF NOT EXISTS branch_budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID REFERENCES branches(id) ON DELETE CASCADE,
  month          DATE NOT NULL,
  revenue_target NUMERIC(12,2) DEFAULT 0,
  expense_budget NUMERIC(12,2) DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, month)
);
ALTER TABLE branch_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_admin_manage_budgets" ON branch_budgets FOR ALL USING (true) WITH CHECK (true);

-- Alert thresholds configurable per branch
CREATE TABLE IF NOT EXISTS owner_alert_thresholds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  metric          TEXT NOT NULL,
  operator        TEXT NOT NULL CHECK (operator IN ('below', 'above')),
  threshold_value NUMERIC(12,2) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owner_alert_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_admin_manage_alert_thresholds" ON owner_alert_thresholds FOR ALL USING (true) WITH CHECK (true);

-- Audit log for owner/admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email  TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_admin_read_audit" ON audit_log FOR SELECT USING (true);
CREATE POLICY "system_insert_audit" ON audit_log FOR INSERT WITH CHECK (true);
