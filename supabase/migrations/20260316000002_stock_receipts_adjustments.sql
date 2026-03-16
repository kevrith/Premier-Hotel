-- =============================================================================
-- Migration: Stock/Inventory Tracking System
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Add stock tracking columns to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

-- 2. Create stock_receipts table (records when items are received/purchased)
CREATE TABLE IF NOT EXISTS stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create stock_adjustments table (manual corrections)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL, -- 'increase', 'decrease', 'recount'
    quantity_before DECIMAL(10,2) NOT NULL,
    quantity_after DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_receipts_menu_item ON stock_receipts(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_received_at ON stock_receipts(received_at);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_menu_item ON stock_adjustments(menu_item_id);

-- Disable RLS
ALTER TABLE stock_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments DISABLE ROW LEVEL SECURITY;
