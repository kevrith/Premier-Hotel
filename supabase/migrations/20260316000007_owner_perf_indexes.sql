-- Performance indexes for owner dashboard queries
-- These cover the most frequently filtered columns across all owner API endpoints

-- orders: time-range + status filters (used in 10+ endpoints)
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created   ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_created   ON orders (assigned_waiter_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id      ON orders (customer_id);

-- bookings: time-range filters
CREATE INDEX IF NOT EXISTS idx_bookings_created_at     ON bookings (created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings (customer_id);

-- expenses: date filters
CREATE INDEX IF NOT EXISTS idx_expenses_date           ON expenses (expense_date);

-- rooms: status filter for occupancy calculations
CREATE INDEX IF NOT EXISTS idx_rooms_status            ON rooms (status);

-- users: branch + role filters
CREATE INDEX IF NOT EXISTS idx_users_branch_id         ON users (branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role              ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_branch_role       ON users (branch_id, role);

-- housekeeping_tasks: status + date
CREATE INDEX IF NOT EXISTS idx_hk_tasks_status         ON housekeeping_tasks (status);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_created_at     ON housekeeping_tasks (created_at);

-- service_requests: status filter
CREATE INDEX IF NOT EXISTS idx_service_req_status      ON service_requests (status);

-- inventory_items: for low-stock scan (column name may vary)
-- CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory_items (quantity);

-- reviews: status filter
CREATE INDEX IF NOT EXISTS idx_reviews_status          ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created  ON reviews (status, created_at DESC);

-- bills: payment_status filter (AR aging)
CREATE INDEX IF NOT EXISTS idx_bills_payment_status    ON bills (payment_status);

-- audit_log: chronological queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at    ON audit_log (created_at DESC);

-- owner_alert_thresholds: active filter
CREATE INDEX IF NOT EXISTS idx_alerts_is_active        ON owner_alert_thresholds (is_active);
