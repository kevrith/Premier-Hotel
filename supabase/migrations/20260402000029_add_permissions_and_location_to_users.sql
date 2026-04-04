-- Add permissions array column to users table (for PermissionManagement feature)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Add assigned_location_id if not already present (for waiter-to-bar assignment)
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Index for fast lookups by location
CREATE INDEX IF NOT EXISTS idx_users_assigned_location ON users(assigned_location_id);
