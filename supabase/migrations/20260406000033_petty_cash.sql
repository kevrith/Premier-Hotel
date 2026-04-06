-- Petty Cash Ledger
-- One entry per branch per day.
-- daily_balance = cash_at_hand - expenses (auto-calculated by backend)
-- cumulative_balance = running total across all entries for the branch

CREATE TABLE IF NOT EXISTS petty_cash_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    entry_date      DATE NOT NULL,
    cash_at_hand    NUMERIC(12,2) NOT NULL DEFAULT 0,
    expenses        NUMERIC(12,2) NOT NULL DEFAULT 0,
    daily_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- cash_at_hand - expenses
    cumulative_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- running total
    notes           TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (branch_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_branch_date ON petty_cash_entries (branch_id, entry_date DESC);

-- Allow service role full access (RLS disabled for backend service-role client)
ALTER TABLE petty_cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON petty_cash_entries
    USING (true) WITH CHECK (true);
