-- Consolidate profiles into users table and update foreign keys

-- 1. Add permissions to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. Update orders table foreign keys to point to users instead of profiles
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_chef_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_waiter_id_fkey;

ALTER TABLE orders ADD CONSTRAINT orders_assigned_chef_id_fkey 
  FOREIGN KEY (assigned_chef_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD CONSTRAINT orders_assigned_waiter_id_fkey 
  FOREIGN KEY (assigned_waiter_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Update recipes table
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_created_by_fkey;
ALTER TABLE recipes ADD CONSTRAINT recipes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.permissions IS 'Array of permission strings for granular access control';
