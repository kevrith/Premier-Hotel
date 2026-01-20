-- Add customer information fields to orders table
-- This allows tracking customer details for walk-in and room service orders

-- Add customer_name column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Add customer_phone column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- Add order_type column to distinguish between room service, walk-in, and dine-in
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20);

-- Add created_by_staff_id to track which waiter/staff created the order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_staff_id UUID;

-- Add room_number for easier room service tracking (derived from location but explicit)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_number VARCHAR(10);

-- Add table_number for easier dine-in tracking (derived from location but explicit)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(10);

-- Add payment_method column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Create index for customer phone lookup (for returning customer detection)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

-- Create index for room number lookup
CREATE INDEX IF NOT EXISTS idx_orders_room_number ON orders(room_number);

-- Create index for table number lookup
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);

-- Create index for order type filtering
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Create index for created_by_staff_id (for employee sales attribution)
CREATE INDEX IF NOT EXISTS idx_orders_created_by_staff_id ON orders(created_by_staff_id);

-- Add comments to document the new fields
COMMENT ON COLUMN orders.customer_name IS 'Customer name for the order (walk-in or room service)';
COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number - used for returning customer detection';
COMMENT ON COLUMN orders.order_type IS 'Type of order: room_service, walk_in, or dine_in';
COMMENT ON COLUMN orders.created_by_staff_id IS 'ID of staff member who created this order (waiter/staff attribution)';
COMMENT ON COLUMN orders.room_number IS 'Room number for room service orders';
COMMENT ON COLUMN orders.table_number IS 'Table number for dine-in orders';

-- Verify the changes
SELECT 'Customer order fields added successfully' AS status;
