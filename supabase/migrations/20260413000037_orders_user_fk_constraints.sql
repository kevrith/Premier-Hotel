-- Add FK constraints on orders.assigned_waiter_id and orders.created_by_staff_id
-- so PostgREST can resolve the table joins used in the manager dashboard query:
--   users!assigned_waiter_id(full_name)
--   users!created_by_staff_id(full_name)
-- Without these FK constraints the query returns 500.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_assigned_waiter_id_fkey'
      AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_assigned_waiter_id_fkey
        FOREIGN KEY (assigned_waiter_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_created_by_staff_id_fkey'
      AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_created_by_staff_id_fkey
        FOREIGN KEY (created_by_staff_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
