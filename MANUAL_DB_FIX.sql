-- ============================================
-- MANUAL FIX: Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop existing constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 2: Add correct status constraint (includes both old and new values for compatibility)
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'in-progress', 'ready', 'served', 'delivered', 'completed', 'cancelled'));

-- Step 3: Add missing timestamp columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Add notes column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 5: Rename 'total' to 'total_amount' if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
        ALTER TABLE public.orders RENAME COLUMN total TO total_amount;
    END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_chef ON public.orders(assigned_chef_id) WHERE assigned_chef_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_waiter ON public.orders(assigned_waiter_id) WHERE assigned_waiter_id IS NOT NULL;

-- Step 7: Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;