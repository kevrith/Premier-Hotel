-- =============================================
-- Migration 015: Add Foreign Key Constraints
-- =============================================
-- Adds referential integrity to database
-- Prevents orphaned records and data inconsistency
-- =============================================

-- Note: These constraints may fail if there's existing orphaned data
-- Run cleanup queries first if needed

-- ===== BOOKINGS TABLE CONSTRAINTS =====

-- Room foreign key (prevent deleting room with active bookings)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_bookings_room'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT fk_bookings_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Customer foreign key (cascade delete if user is deleted)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_bookings_customer'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT fk_bookings_customer
        FOREIGN KEY (customer_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ===== ORDERS TABLE CONSTRAINTS =====

-- Customer foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_orders_customer'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES users(id)
        ON DELETE SET NULL  -- Keep order record even if customer deleted
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Staff (waiter/chef) foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_orders_staff'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT fk_orders_staff
        FOREIGN KEY (created_by_staff_id) REFERENCES users(id)
        ON DELETE SET NULL  -- Keep order even if staff member deleted
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ===== PAYMENTS TABLE CONSTRAINTS =====

-- Bill foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payments_bill'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT fk_payments_bill
        FOREIGN KEY (bill_id) REFERENCES bills(id)
        ON DELETE RESTRICT  -- Cannot delete bill with associated payments
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Waiter foreign key (who processed the payment)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payments_waiter'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT fk_payments_waiter
        FOREIGN KEY (processed_by_waiter_id) REFERENCES users(id)
        ON DELETE SET NULL  -- Keep payment even if waiter deleted
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ===== ORDER_ITEMS TABLE CONSTRAINTS =====
-- (If order_items table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        -- Order foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_order_items_order') THEN
            ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_order
            FOREIGN KEY (order_id) REFERENCES orders(id)
            ON DELETE CASCADE  -- Delete items when order is deleted
            ON UPDATE CASCADE;
        END IF;

        -- Menu item foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_order_items_menu_item') THEN
            ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_menu_item
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            ON DELETE RESTRICT  -- Cannot delete menu item that's in orders
            ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ===== REVIEWS TABLE CONSTRAINTS =====
-- (If reviews table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        -- Room foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_reviews_room') THEN
            ALTER TABLE reviews
            ADD CONSTRAINT fk_reviews_room
            FOREIGN KEY (room_id) REFERENCES rooms(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        END IF;

        -- User foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_reviews_user') THEN
            ALTER TABLE reviews
            ADD CONSTRAINT fk_reviews_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        END IF;

        -- Booking foreign key (review for specific booking)
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reviews' AND column_name = 'booking_id') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_reviews_booking') THEN
                ALTER TABLE reviews
                ADD CONSTRAINT fk_reviews_booking
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- ===== HOUSEKEEPING_TASKS TABLE CONSTRAINTS =====
-- (If housekeeping_tasks table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') THEN
        -- Room foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_housekeeping_room') THEN
            ALTER TABLE housekeeping_tasks
            ADD CONSTRAINT fk_housekeeping_room
            FOREIGN KEY (room_id) REFERENCES rooms(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        END IF;

        -- Assigned staff foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_housekeeping_assigned_to') THEN
            ALTER TABLE housekeeping_tasks
            ADD CONSTRAINT fk_housekeeping_assigned_to
            FOREIGN KEY (assigned_to) REFERENCES users(id)
            ON DELETE SET NULL  -- Task remains if staff deleted
            ON UPDATE CASCADE;
        END IF;

        -- Created by foreign key
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'housekeeping_tasks' AND column_name = 'created_by') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_housekeeping_created_by') THEN
                ALTER TABLE housekeeping_tasks
                ADD CONSTRAINT fk_housekeeping_created_by
                FOREIGN KEY (created_by) REFERENCES users(id)
                ON DELETE SET NULL
                ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- ===== NOTIFICATIONS TABLE CONSTRAINTS =====
-- (If notifications table exists)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- User foreign key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_notifications_user') THEN
            ALTER TABLE notifications
            ADD CONSTRAINT fk_notifications_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE  -- Delete notifications when user deleted
            ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ===== ADD CHECK CONSTRAINTS FOR DATA VALIDATION =====

-- Bookings: Ensure valid dates
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS check_valid_dates;

ALTER TABLE bookings
ADD CONSTRAINT check_valid_dates
CHECK (check_out_date > check_in_date);

-- Bookings: Ensure positive amounts
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS check_positive_amount;

ALTER TABLE bookings
ADD CONSTRAINT check_positive_amount
CHECK (total_amount >= 0);

-- Bookings: Ensure valid guest count
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_guests_positive') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT check_guests_positive
        CHECK (guests > 0);
    END IF;
END $$;

-- Orders: Ensure positive total
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_order_positive_total') THEN
        ALTER TABLE orders
        ADD CONSTRAINT check_order_positive_total
        CHECK (total_amount >= 0);
    END IF;
END $$;

-- Payments: Ensure positive amount
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_payment_positive_amount') THEN
        ALTER TABLE payments
        ADD CONSTRAINT check_payment_positive_amount
        CHECK (amount > 0);
    END IF;
END $$;

-- Rooms: Ensure positive max_occupancy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_room_positive_max_occupancy') THEN
        ALTER TABLE rooms
        ADD CONSTRAINT check_room_positive_max_occupancy
        CHECK (max_occupancy > 0);
    END IF;
END $$;

-- Menu items: Ensure positive price
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_menu_positive_price') THEN
        ALTER TABLE menu_items
        ADD CONSTRAINT check_menu_positive_price
        CHECK (base_price >= 0);
    END IF;
END $$;

-- ===== ADD NOT NULL CONSTRAINTS WHERE APPROPRIATE =====

-- Critical fields that should never be null
ALTER TABLE bookings
ALTER COLUMN customer_id SET NOT NULL,
ALTER COLUMN room_id SET NOT NULL,
ALTER COLUMN check_in_date SET NOT NULL,
ALTER COLUMN check_out_date SET NOT NULL,
ALTER COLUMN total_amount SET NOT NULL;

ALTER TABLE orders
ALTER COLUMN total_amount SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

ALTER TABLE payments
ALTER COLUMN bill_id SET NOT NULL,
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN payment_method SET NOT NULL,
ALTER COLUMN payment_status SET NOT NULL,
ALTER COLUMN processed_by_waiter_id SET NOT NULL;

ALTER TABLE rooms
ALTER COLUMN room_number SET NOT NULL,
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN max_occupancy SET NOT NULL,
ALTER COLUMN base_price SET NOT NULL;

-- ===== CREATE FUNCTION TO VALIDATE ORPHANED RECORDS =====

CREATE OR REPLACE FUNCTION check_orphaned_records()
RETURNS TABLE (
    table_name TEXT,
    orphaned_count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Check bookings with non-existent rooms
    RETURN QUERY
    SELECT
        'bookings'::TEXT,
        COUNT(*)::BIGINT,
        'Bookings referencing non-existent rooms'::TEXT
    FROM bookings b
    WHERE NOT EXISTS (SELECT 1 FROM rooms r WHERE r.id = b.room_id);

    -- Check bookings with non-existent customers
    RETURN QUERY
    SELECT
        'bookings'::TEXT,
        COUNT(*)::BIGINT,
        'Bookings referencing non-existent customers'::TEXT
    FROM bookings b
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.customer_id);

    -- Check orders with non-existent customers
    RETURN QUERY
    SELECT
        'orders'::TEXT,
        COUNT(*)::BIGINT,
        'Orders referencing non-existent customers'::TEXT
    FROM orders o
    WHERE o.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.customer_id);

    -- Check payments with non-existent bills
    RETURN QUERY
    SELECT
        'payments'::TEXT,
        COUNT(*)::BIGINT,
        'Payments referencing non-existent bills'::TEXT
    FROM payments p
    WHERE NOT EXISTS (SELECT 1 FROM bills b WHERE b.id = p.bill_id);

    -- Check payments with non-existent waiters
    RETURN QUERY
    SELECT
        'payments'::TEXT,
        COUNT(*)::BIGINT,
        'Payments referencing non-existent waiters'::TEXT
    FROM payments p
    WHERE p.processed_by_waiter_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.processed_by_waiter_id);
END;
$$ LANGUAGE plpgsql;

-- Run orphan check
SELECT * FROM check_orphaned_records();

-- Add comments
COMMENT ON CONSTRAINT fk_bookings_room ON bookings IS 'Ensures booking references valid room';
COMMENT ON CONSTRAINT fk_bookings_customer ON bookings IS 'Ensures booking references valid customer';
COMMENT ON CONSTRAINT fk_orders_customer ON orders IS 'Ensures order references valid customer';
COMMENT ON CONSTRAINT fk_payments_bill ON payments IS 'Ensures payment references valid bill';
COMMENT ON CONSTRAINT fk_payments_waiter ON payments IS 'Ensures payment references valid waiter';
