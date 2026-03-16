-- Migration: Add void_log table for item-level voids
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS void_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    void_reason TEXT NOT NULL,
    voided_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_void_log_order_id ON void_log(order_id);
CREATE INDEX IF NOT EXISTS idx_void_log_voided_at ON void_log(voided_at);
CREATE INDEX IF NOT EXISTS idx_void_log_voided_by ON void_log(voided_by);

-- Disable RLS for now (consistent with rest of app)
ALTER TABLE void_log DISABLE ROW LEVEL SECURITY;
