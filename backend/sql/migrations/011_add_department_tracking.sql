-- =============================================
-- Migration 011: Add Department Tracking
-- =============================================
-- This fixes the broken department functionality
-- Currently department is hardcoded to "General"
-- This migration adds proper department tracking
-- =============================================

-- 0. Ensure orders table has total column (for backward compatibility)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;

-- 1. Add department columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_center VARCHAR(50);

-- 2. Create departments reference table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  cost_center VARCHAR(50),
  manager_id UUID REFERENCES users(id),
  budget DECIMAL(12,2),
  is_revenue_center BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Insert standard hotel departments
INSERT INTO departments (name, code, is_revenue_center, description) VALUES
  ('Front Desk', 'FD', true, 'Guest check-in, check-out, and front desk operations'),
  ('Housekeeping', 'HK', false, 'Room cleaning and maintenance'),
  ('Kitchen', 'KIT', false, 'Food preparation and culinary operations'),
  ('Restaurant', 'REST', true, 'Restaurant and dining service'),
  ('Bar', 'BAR', true, 'Bar and beverage service'),
  ('Room Service', 'RS', true, 'In-room dining and service'),
  ('Maintenance', 'MAINT', false, 'Building and equipment maintenance'),
  ('Management', 'MGMT', false, 'Hotel management and administration'),
  ('Accounting', 'ACCT', false, 'Accounting and finance'),
  ('Security', 'SEC', false, 'Security and safety operations')
ON CONFLICT (name) DO NOTHING;

-- 4. Update existing users based on their roles
-- Assign departments to existing users
UPDATE users SET department = 'Restaurant' WHERE role = 'waiter' AND (department IS NULL OR department = '');
UPDATE users SET department = 'Kitchen' WHERE role = 'chef' AND (department IS NULL OR department = '');
UPDATE users SET department = 'Housekeeping' WHERE role = 'cleaner' AND (department IS NULL OR department = '');
UPDATE users SET department = 'Management' WHERE role IN ('manager', 'owner', 'admin') AND (department IS NULL OR department = '');
UPDATE users SET department = 'Front Desk' WHERE role = 'customer' AND (department IS NULL OR department = '');

-- 5. Set default department for any remaining users
UPDATE users SET department = 'General' WHERE department IS NULL OR department = '';

-- 6. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

-- 7. Add department budget tracking table
CREATE TABLE IF NOT EXISTS department_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  budget_amount DECIMAL(12,2) NOT NULL,
  actual_amount DECIMAL(12,2) DEFAULT 0,
  variance DECIMAL(12,2) GENERATED ALWAYS AS (actual_amount - budget_amount) STORED,
  variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN budget_amount > 0
    THEN ((actual_amount - budget_amount) / budget_amount * 100)
    ELSE 0 END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id, fiscal_year, quarter, month)
);

-- 8. Create department performance view
CREATE OR REPLACE VIEW department_performance AS
SELECT
  d.id,
  d.name as department_name,
  d.code as department_code,
  d.is_revenue_center,
  COUNT(DISTINCT u.id) as employee_count,
  COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) as active_employees,
  COALESCE(SUM(o.total), 0) as total_revenue,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(AVG(o.total), 0) as avg_order_value
FROM departments d
LEFT JOIN users u ON u.department = d.name AND u.role IN ('waiter', 'chef', 'cleaner', 'manager')
LEFT JOIN orders o ON o.created_by_staff_id = u.id AND o.status = 'completed'
WHERE d.is_active = true
GROUP BY d.id, d.name, d.code, d.is_revenue_center;

-- 9. Create function to get department statistics
CREATE OR REPLACE FUNCTION get_department_stats(
  dept_name VARCHAR,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  department VARCHAR,
  total_revenue DECIMAL,
  total_orders INTEGER,
  employee_count INTEGER,
  avg_order_value DECIMAL,
  revenue_per_employee DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.name::VARCHAR as department,
    COALESCE(SUM(o.total), 0)::DECIMAL as total_revenue,
    COUNT(DISTINCT o.id)::INTEGER as total_orders,
    COUNT(DISTINCT u.id)::INTEGER as employee_count,
    COALESCE(AVG(o.total), 0)::DECIMAL as avg_order_value,
    CASE
      WHEN COUNT(DISTINCT u.id) > 0
      THEN (COALESCE(SUM(o.total), 0) / COUNT(DISTINCT u.id))::DECIMAL
      ELSE 0
    END as revenue_per_employee
  FROM departments d
  LEFT JOIN users u ON u.department = d.name AND u.status = 'active'
  LEFT JOIN orders o ON o.created_by_staff_id = u.id
    AND o.status = 'completed'
    AND o.created_at BETWEEN start_date AND end_date
  WHERE d.name = dept_name OR dept_name IS NULL
  GROUP BY d.name;
END;
$$ LANGUAGE plpgsql;

-- 10. Add audit logging for department changes
CREATE TABLE IF NOT EXISTS department_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  old_department VARCHAR(100),
  new_department VARCHAR(100),
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Create trigger to log department changes
CREATE OR REPLACE FUNCTION log_department_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO department_change_log (user_id, old_department, new_department, changed_by)
    VALUES (NEW.id, OLD.department, NEW.department, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_department_change ON users;
CREATE TRIGGER trigger_log_department_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_department_change();

-- 12. Add comments for documentation
COMMENT ON TABLE departments IS 'Master table of hotel departments and cost centers';
COMMENT ON TABLE department_budgets IS 'Budget tracking and variance analysis by department';
COMMENT ON TABLE department_change_log IS 'Audit trail of employee department transfers';
COMMENT ON VIEW department_performance IS 'Real-time department performance metrics';
COMMENT ON COLUMN users.department IS 'Department assignment for employee (links to departments.name)';
COMMENT ON COLUMN users.cost_center IS 'Cost center code for accounting purposes';

-- =============================================
-- Migration Complete
-- =============================================
-- Next Steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update backend/app/api/v1/endpoints/reports.py to use real department field
-- 3. Update frontend components to show department filtering
-- =============================================
