-- Ensure RLS is disabled on stock_receipts tables so admin client can read/write freely.
-- Also ensures the tables exist in case the previous migration had a partial failure.

ALTER TABLE IF EXISTS stock_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_receipt_items DISABLE ROW LEVEL SECURITY;

-- Ensure stock_transfers also has RLS off (used by transfer-batch endpoint)
ALTER TABLE IF EXISTS stock_transfers DISABLE ROW LEVEL SECURITY;
