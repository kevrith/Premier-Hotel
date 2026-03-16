-- Balance Sheet Manual Adjustments
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS balance_sheet_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section     TEXT NOT NULL CHECK (section IN (
                'fixed_assets',       -- e.g. Land, Building, Equipment, Vehicles
                'other_assets',       -- e.g. Deposits, Prepaid expenses
                'loans',              -- e.g. Bank loans, Director loans
                'other_liabilities',  -- e.g. Tax payable, Accruals
                'owner_capital',      -- Capital injected by owner
                'owner_drawings'      -- Money withdrawn by owner
              )),
  name        TEXT NOT NULL,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow admin/manager roles to read and write
ALTER TABLE balance_sheet_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_bs_adjustments"
  ON balance_sheet_adjustments
  FOR ALL
  USING (true)
  WITH CHECK (true);
