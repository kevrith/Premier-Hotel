CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- e.g. "Tokyo", "Table 1", "VIP Terrace"
  section VARCHAR(100),                  -- e.g. "Indoor", "Terrace", "Bar"
  capacity INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'inactive')),
  assigned_waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_waiter ON restaurant_tables(assigned_waiter_id);

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to restaurant_tables"
  ON restaurant_tables FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read restaurant_tables"
  ON restaurant_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage restaurant_tables"
  ON restaurant_tables FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','manager','waiter','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','manager','waiter','staff')));
