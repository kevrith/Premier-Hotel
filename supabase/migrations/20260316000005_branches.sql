-- Multi-Branch / Multi-Store support for the Owner

CREATE TABLE IF NOT EXISTS branches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  location     TEXT,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  manager_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive', 'under_renovation')),
  opened_at    DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Assign staff/users to a branch
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Seed the current hotel as Branch 1 so existing data belongs to it
INSERT INTO branches (id, name, location, status, opened_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Premier Hotel – Main Branch',
  'Nairobi, Kenya',
  'active',
  CURRENT_DATE
) ON CONFLICT (id) DO NOTHING;

-- Tag all existing users as belonging to the main branch
UPDATE users SET branch_id = '00000000-0000-0000-0000-000000000001'
WHERE branch_id IS NULL;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_admin_manage_branches" ON branches FOR ALL USING (true) WITH CHECK (true);
