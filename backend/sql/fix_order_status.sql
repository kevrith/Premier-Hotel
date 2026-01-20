-- ============================================
-- Fix Order Status Schema Mismatch
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Update orders table status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add correct status constraint matching backend API
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'));

-- Step 2: Add missing timestamp columns for status tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Rename 'total' column to 'total_amount' for consistency
ALTER TABLE public.orders RENAME COLUMN total TO total_amount;

-- Step 4: Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);

-- Step 5: Create index on assigned staff for dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_assigned_chef ON public.orders(assigned_chef_id) WHERE assigned_chef_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_waiter ON public.orders(assigned_waiter_id) WHERE assigned_waiter_id IS NOT NULL;

-- Step 6: Update any existing orders with old status values
-- (This is safe because the table is likely empty or has minimal data)
UPDATE public.orders
SET status = 'confirmed'
WHERE status = 'in-progress' AND preparing_started_at IS NULL;

UPDATE public.orders
SET status = 'preparing'
WHERE status = 'in-progress' AND preparing_started_at IS NOT NULL;

UPDATE public.orders
SET status = 'served'
WHERE status = 'delivered';

-- Step 7: Add notes column for staff comments
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 8: Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Set timestamp based on new status
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        NEW.confirmed_at = NOW();
    ELSIF NEW.status = 'preparing' AND OLD.status != 'preparing' THEN
        NEW.preparing_started_at = NOW();
    ELSIF NEW.status = 'ready' AND OLD.status != 'ready' THEN
        NEW.ready_at = NOW();
    ELSIF NEW.status = 'served' AND OLD.status != 'served' THEN
        NEW.served_at = NOW();
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to call the function
DROP TRIGGER IF EXISTS order_status_timestamp_trigger ON public.orders;
CREATE TRIGGER order_status_timestamp_trigger
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status_timestamp();

-- Step 10: Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_order_status_timestamp() TO authenticated;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY column_name;

-- Check constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%orders%status%';

COMMIT;
