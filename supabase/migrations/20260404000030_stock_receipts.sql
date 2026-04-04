-- Stock Receipts: direct receive of goods from a supplier into a location
-- No purchase order needed — just supplier + items + quantities + cost prices

CREATE TABLE IF NOT EXISTS stock_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number  TEXT NOT NULL UNIQUE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  received_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  received_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  total_cost      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  menu_item_id    UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name       TEXT NOT NULL,
  quantity        NUMERIC(12, 3) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for receipt number
CREATE SEQUENCE IF NOT EXISTS stock_receipt_seq START 1;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_stock_receipts_supplier ON stock_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_received_at ON stock_receipts(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_receipt ON stock_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_menu_item ON stock_receipt_items(menu_item_id);
