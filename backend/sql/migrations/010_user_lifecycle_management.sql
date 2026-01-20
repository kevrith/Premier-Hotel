-- User Lifecycle Management Migration
-- Adds user status tracking, audit logging, and termination management

-- ============================================
-- 1. Add new columns to users table
-- ============================================

-- Add status column (active, inactive, suspended, terminated, deleted)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add termination tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Add user creation tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- Add login tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP;

-- Add update tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- ============================================
-- 2. Create user_audit_log table
-- ============================================

CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by_user_id UUID NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_performed_by FOREIGN KEY (performed_by_user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. Create indexes for performance
-- ============================================

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_terminated_at ON users(terminated_at);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON user_audit_log(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON user_audit_log(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON user_audit_log(user_id, action);

-- ============================================
-- 4. Create trigger for updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Create helper functions
-- ============================================

-- Function to check if user has active obligations
CREATE OR REPLACE FUNCTION check_user_active_obligations(p_user_id UUID)
RETURNS TABLE(
    has_obligations BOOLEAN,
    obligation_type TEXT,
    obligation_count INTEGER
) AS $$
BEGIN
    -- Check for unpaid bills
    IF EXISTS (
        SELECT 1 FROM bills
        WHERE settled_by_waiter_id = p_user_id
        AND payment_status != 'paid'
    ) THEN
        RETURN QUERY SELECT TRUE, 'unpaid_bills',
            (SELECT COUNT(*)::INTEGER FROM bills
             WHERE settled_by_waiter_id = p_user_id
             AND payment_status != 'paid');
        RETURN;
    END IF;

    -- Check for pending orders
    IF EXISTS (
        SELECT 1 FROM orders
        WHERE created_by_staff_id = p_user_id
        AND status IN ('pending', 'preparing', 'ready')
    ) THEN
        RETURN QUERY SELECT TRUE, 'pending_orders',
            (SELECT COUNT(*)::INTEGER FROM orders
             WHERE created_by_staff_id = p_user_id
             AND status IN ('pending', 'preparing', 'ready'));
        RETURN;
    END IF;

    -- Check for active bookings (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF EXISTS (
            SELECT 1 FROM bookings
            WHERE created_by IS NOT NULL
            AND created_by::TEXT = p_user_id::TEXT
            AND status = 'confirmed'
            AND check_in_date >= CURRENT_DATE
        ) THEN
            RETURN QUERY SELECT TRUE, 'active_bookings',
                (SELECT COUNT(*)::INTEGER FROM bookings
                 WHERE created_by IS NOT NULL
                 AND created_by::TEXT = p_user_id::TEXT
                 AND status = 'confirmed'
                 AND check_in_date >= CURRENT_DATE);
            RETURN;
        END IF;
    END IF;

    -- No obligations found
    RETURN QUERY SELECT FALSE, 'none', 0;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_user_audit(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_performed_by UUID,
    p_details JSONB DEFAULT NULL,
    p_ip_address VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO user_audit_log (
        user_id,
        action,
        performed_by_user_id,
        details,
        ip_address
    ) VALUES (
        p_user_id,
        p_action,
        p_performed_by,
        p_details,
        p_ip_address
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Update existing users with default values
-- ============================================

-- Set all existing users to 'active' status if not already set
UPDATE users SET status = 'active' WHERE status IS NULL;

-- ============================================
-- 7. Create views for common queries
-- ============================================

-- View for active users only
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE status = 'active';

-- View for user summary with audit info
CREATE OR REPLACE VIEW user_summary AS
SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.created_at,
    u.last_login_at,
    u.terminated_at,
    u.termination_reason,
    creator.full_name as created_by_name,
    (SELECT COUNT(*) FROM user_audit_log WHERE user_id = u.id) as audit_log_count,
    (SELECT MAX(created_at) FROM user_audit_log WHERE user_id = u.id) as last_audit_at
FROM users u
LEFT JOIN users creator ON u.created_by_user_id = creator.id;

-- ============================================
-- 8. Add check constraints
-- ============================================

-- Ensure status is valid
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_status;
ALTER TABLE users ADD CONSTRAINT check_user_status
    CHECK (status IN ('active', 'inactive', 'suspended', 'terminated', 'deleted'));

-- If terminated, must have termination_reason
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_termination_reason;
ALTER TABLE users ADD CONSTRAINT check_termination_reason
    CHECK (
        (status IN ('terminated', 'deleted') AND termination_reason IS NOT NULL) OR
        (status NOT IN ('terminated', 'deleted'))
    );

-- ============================================
-- Success message
-- ============================================

SELECT 'User lifecycle management migration completed successfully!' as status;
