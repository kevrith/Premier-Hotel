-- Add waiter_id column to orders table
ALTER TABLE orders ADD COLUMN waiter_id UUID REFERENCES users(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON orders(waiter_id);

-- Update existing orders to set waiter_id based on location/area logic
-- This is a placeholder - in a real system, you'd need to determine waiter assignments
-- For now, we'll leave existing orders with NULL waiter_id

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'waiter_id';