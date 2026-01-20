-- =============================================
-- Migration 013: Add Performance Indexes
-- =============================================
-- Adds indexes to frequently queried columns
-- Improves query performance by 10-100x
-- =============================================

-- ===== USERS TABLE INDEXES =====

-- Email lookups (login, password reset)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email)
WHERE email IS NOT NULL;

-- Phone number lookups (login, SMS)
CREATE INDEX IF NOT EXISTS idx_users_phone
ON users(phone)
WHERE phone IS NOT NULL;

-- Role and status filtering (staff queries, active users)
CREATE INDEX IF NOT EXISTS idx_users_role_status
ON users(role, status);

-- Department filtering (employee reports)
CREATE INDEX IF NOT EXISTS idx_users_department_role
ON users(department, role)
WHERE department IS NOT NULL;

-- ===== BOOKINGS TABLE INDEXES =====

-- Customer bookings list
CREATE INDEX IF NOT EXISTS idx_bookings_customer_created
ON bookings(customer_id, created_at DESC);

-- Room availability checks (already created in migration 012)
-- CREATE INDEX IF NOT EXISTS idx_bookings_room_dates_status
-- ON bookings(room_id, check_in_date, check_out_date, status);

-- Booking reference lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reference
ON bookings(booking_reference)
WHERE booking_reference IS NOT NULL;

-- Status filtering (pending, confirmed, cancelled)
CREATE INDEX IF NOT EXISTS idx_bookings_status_created
ON bookings(status, created_at DESC);

-- Payment status tracking
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
ON bookings(payment_status)
WHERE payment_status IS NOT NULL;

-- Check-in date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_checkin_date
ON bookings(check_in_date DESC);

-- ===== ORDERS TABLE INDEXES =====

-- Customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
ON orders(customer_id, created_at DESC)
WHERE customer_id IS NOT NULL;

-- Staff order tracking (waiter/chef dashboards)
CREATE INDEX IF NOT EXISTS idx_orders_staff_created
ON orders(created_by_staff_id, created_at DESC)
WHERE created_by_staff_id IS NOT NULL;

-- Order status filtering (pending, preparing, served)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- Payment status (unpaid orders for billing)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

-- Table/Room number lookups
CREATE INDEX IF NOT EXISTS idx_orders_table_number
ON orders(table_number)
WHERE table_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_room_number
ON orders(room_number)
WHERE room_number IS NOT NULL;

-- Order type filtering (room_service, walk_in, dine_in)
CREATE INDEX IF NOT EXISTS idx_orders_order_type
ON orders(order_type)
WHERE order_type IS NOT NULL;

-- ===== PAYMENTS TABLE INDEXES =====

-- Bill payments
CREATE INDEX IF NOT EXISTS idx_payments_bill
ON payments(bill_id)
WHERE bill_id IS NOT NULL;

-- Waiter payment processing
CREATE INDEX IF NOT EXISTS idx_payments_waiter
ON payments(processed_by_waiter_id)
WHERE processed_by_waiter_id IS NOT NULL;

-- Payment status tracking
CREATE INDEX IF NOT EXISTS idx_payments_status_created
ON payments(payment_status, created_at DESC);

-- Payment method analysis
CREATE INDEX IF NOT EXISTS idx_payments_method
ON payments(payment_method);

-- M-Pesa code lookups
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_code
ON payments(mpesa_code)
WHERE mpesa_code IS NOT NULL;

-- Completed payments by date (revenue reports)
CREATE INDEX IF NOT EXISTS idx_payments_completed_date
ON payments(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- ===== ROOMS TABLE INDEXES =====

-- Room type filtering
CREATE INDEX IF NOT EXISTS idx_rooms_type_status
ON rooms(type, status);

-- Available rooms query
CREATE INDEX IF NOT EXISTS idx_rooms_status
ON rooms(status);

-- Floor filtering
CREATE INDEX IF NOT EXISTS idx_rooms_floor
ON rooms(floor)
WHERE floor IS NOT NULL;

-- ===== MENU_ITEMS TABLE INDEXES =====

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_category
ON menu_items(category);

-- Available items
CREATE INDEX IF NOT EXISTS idx_menu_items_available
ON menu_items(is_available);

-- Available items filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_available_category
ON menu_items(is_available, category)
WHERE is_available = true;

-- ===== ORDER_ITEMS TABLE INDEXES =====
-- (Only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        -- Order items lookup
        CREATE INDEX IF NOT EXISTS idx_order_items_order
        ON order_items(order_id);

        -- Menu item sales analysis
        CREATE INDEX IF NOT EXISTS idx_order_items_menu
        ON order_items(menu_item_id);
    END IF;
END $$;

-- ===== REVIEWS TABLE INDEXES =====
-- (Only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        -- Room reviews
        CREATE INDEX IF NOT EXISTS idx_reviews_room
        ON reviews(room_id);

        -- User reviews
        CREATE INDEX IF NOT EXISTS idx_reviews_user
        ON reviews(user_id);
    END IF;
END $$;

-- ===== NOTIFICATIONS TABLE INDEXES =====
-- (Only if table exists and has the expected columns)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- User notifications
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_user_created
            ON notifications(user_id, created_at DESC);
        END IF;

        -- Unread notifications (only if is_read column exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_unread
            ON notifications(user_id, is_read, created_at DESC);
        END IF;
    END IF;
END $$;

-- ===== HOUSEKEEPING_TASKS TABLE INDEXES =====
-- (Only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') THEN
        -- Assigned staff tasks
        CREATE INDEX IF NOT EXISTS idx_housekeeping_staff_status
        ON housekeeping_tasks(assigned_to, status);

        -- Room tasks
        CREATE INDEX IF NOT EXISTS idx_housekeeping_room
        ON housekeeping_tasks(room_id);
    END IF;
END $$;

-- ===== COMPOSITE INDEXES FOR COMPLEX QUERIES =====

-- Revenue reports by date range and status
CREATE INDEX IF NOT EXISTS idx_orders_date_status_total
ON orders(created_at DESC, status, total)
WHERE total IS NOT NULL;

-- Staff performance reports
CREATE INDEX IF NOT EXISTS idx_orders_staff_date_status
ON orders(created_by_staff_id, created_at DESC, status)
WHERE created_by_staff_id IS NOT NULL;

-- Booking revenue analysis
CREATE INDEX IF NOT EXISTS idx_bookings_date_status_amount
ON bookings(created_at DESC, status, total_amount);

-- ===== PARTIAL INDEXES FOR COMMON FILTERS =====

-- Active bookings only
CREATE INDEX IF NOT EXISTS idx_bookings_active
ON bookings(room_id, check_in_date, check_out_date)
WHERE status IN ('pending', 'confirmed', 'checked_in');

-- Pending orders for kitchen/waiter dashboards
CREATE INDEX IF NOT EXISTS idx_orders_pending
ON orders(created_at ASC)
WHERE status IN ('pending', 'preparing');

-- Unpaid bookings
CREATE INDEX IF NOT EXISTS idx_bookings_unpaid
ON bookings(customer_id, created_at DESC)
WHERE payment_status = 'unpaid';

-- Failed payments for retry
CREATE INDEX IF NOT EXISTS idx_payments_failed
ON payments(created_at DESC)
WHERE payment_status = 'failed';

-- ===== ANALYZE TABLES FOR QUERY PLANNER =====

ANALYZE users;
ANALYZE bookings;
ANALYZE orders;
ANALYZE payments;
ANALYZE rooms;
ANALYZE menu_items;

-- Add comment
COMMENT ON INDEX idx_users_email IS 'Fast email lookups for login and password reset';
COMMENT ON INDEX idx_bookings_customer_created IS 'Customer booking history ordered by date';
COMMENT ON INDEX idx_orders_status_created IS 'Order filtering and sorting by status and date';
COMMENT ON INDEX idx_payments_status_created IS 'Payment tracking and revenue reports';
