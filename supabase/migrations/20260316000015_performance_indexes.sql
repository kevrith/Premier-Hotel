-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes — Premier Hotel
-- Adds missing indexes on high-traffic columns identified during audit.
-- All use CREATE INDEX IF NOT EXISTS so safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── orders ───────────────────────────────────────────────────────────────────
-- status is filtered on almost every orders query (completed/delivered/served)
CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders(status);

-- created_at is range-filtered and sorted in every report
CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders(created_at DESC);

-- customer_id is used for /my-orders and customer history lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id
    ON orders(customer_id);

-- assigned_waiter_id is used to map orders → branch in owner dashboard
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id
    ON orders(assigned_waiter_id);

-- Composite: most report queries filter by status + date range
CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON orders(status, created_at DESC);

-- ── bookings ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at
    ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_room_id
    ON bookings(room_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
    ON bookings(customer_id);

-- ── users ────────────────────────────────────────────────────────────────────
-- role is checked on every auth middleware call and staff queries
CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_branch_id
    ON users(branch_id);

-- ── bills ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bills_payment_status
    ON bills(payment_status);

CREATE INDEX IF NOT EXISTS idx_bills_order_id
    ON bills(order_id);

-- ── rooms ────────────────────────────────────────────────────────────────────
-- status is used for occupancy counts on every dashboard load
CREATE INDEX IF NOT EXISTS idx_rooms_status
    ON rooms(status);

-- ── menu_items ───────────────────────────────────────────────────────────────
-- track_inventory + stock_quantity are used in every stock query
CREATE INDEX IF NOT EXISTS idx_menu_items_track_inventory
    ON menu_items(track_inventory)
    WHERE track_inventory = true;

CREATE INDEX IF NOT EXISTS idx_menu_items_category
    ON menu_items(category);

CREATE INDEX IF NOT EXISTS idx_menu_items_stock_dept
    ON menu_items(stock_department);

-- ── expenses ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_date
    ON expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_type
    ON expenses(expense_type);

-- ── stock_receipts ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_receipts_received_at
    ON stock_receipts(received_at DESC);

-- ── daily_stock_sessions ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_stock_sessions_date
    ON daily_stock_sessions(session_date DESC);

-- ── service_requests ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_requests_status
    ON service_requests(status);

CREATE INDEX IF NOT EXISTS idx_service_requests_created
    ON service_requests(created_at DESC);
