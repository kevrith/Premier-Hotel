-- Add capital_injection column to petty_cash_entries
-- Capital Injection = money put INTO the business by the owner/investor,
-- separate from daily operational cash (cash_at_hand) and expenses.
-- daily_balance is now: cash_at_hand + capital_injection - expenses

ALTER TABLE petty_cash_entries
    ADD COLUMN IF NOT EXISTS capital_injection NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Recalculate daily_balance for all existing rows to match the new formula
-- (capital_injection is 0 for all existing rows so daily_balance is unchanged)
UPDATE petty_cash_entries
SET daily_balance = ROUND(cash_at_hand + capital_injection - expenses, 2);
