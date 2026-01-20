-- Add missing important columns to tables

-- 1. Add total_guests column to bookings table
-- This tracks how many guests are staying in each booking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 1 CHECK (total_guests >= 1);

COMMENT ON COLUMN bookings.total_guests IS 'Number of guests for this booking - important for occupancy tracking and reporting';

-- 2. Add estimated_ready_time column to orders table
-- This helps customers know when their food will be ready
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMPTZ;

COMMENT ON COLUMN orders.estimated_ready_time IS 'Estimated time when the order will be ready - calculated based on preparation times';

-- 3. Add actual_ready_time for tracking kitchen performance
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS actual_ready_time TIMESTAMPTZ;

COMMENT ON COLUMN orders.actual_ready_time IS 'Actual time when order was marked as ready - used for kitchen performance metrics';

-- Display confirmation
SELECT 'Columns added successfully!' as status;
