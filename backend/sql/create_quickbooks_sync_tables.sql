-- ============================================================================
-- QuickBooks POS 2013 Integration - Database Schema
-- ============================================================================
-- Creates tables for managing QuickBooks sync configuration, transaction logs,
-- and data mappings between Premier Hotel and QuickBooks POS 2013.
--
-- Tables:
-- 1. quickbooks_config - Configuration and credentials
-- 2. quickbooks_sync_log - Transaction sync audit trail
-- 3. quickbooks_item_mapping - Menu/Inventory items to QB items mapping
-- 4. quickbooks_customer_mapping - Hotel users to QB customers mapping
-- ============================================================================

-- Drop existing tables if they exist (for fresh installation)
DROP TABLE IF EXISTS quickbooks_customer_mapping CASCADE;
DROP TABLE IF EXISTS quickbooks_item_mapping CASCADE;
DROP TABLE IF EXISTS quickbooks_sync_log CASCADE;
DROP TABLE IF EXISTS quickbooks_config CASCADE;

-- ============================================================================
-- Table: quickbooks_config
-- Purpose: Stores QuickBooks POS connection configuration and credentials
-- ============================================================================
CREATE TABLE quickbooks_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Connection details
    company_file_path TEXT NOT NULL,
    web_connector_url TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,

    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT false,
    sync_sales BOOLEAN DEFAULT true,
    sync_inventory BOOLEAN DEFAULT true,
    inventory_sync_interval_minutes INTEGER DEFAULT 60,

    -- Status tracking
    connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
    last_connection_test TIMESTAMP,
    last_inventory_sync TIMESTAMP,
    last_sales_sync TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),

    CONSTRAINT quickbooks_config_singleton CHECK (id = gen_random_uuid())
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quickbooks_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quickbooks_config_update_timestamp
    BEFORE UPDATE ON quickbooks_config
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_config_timestamp();

-- ============================================================================
-- Table: quickbooks_sync_log
-- Purpose: Audit trail for all QuickBooks synchronization operations
-- ============================================================================
CREATE TABLE quickbooks_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync operation details
    sync_type TEXT NOT NULL CHECK (sync_type IN ('sale', 'inventory_pull', 'inventory_push', 'customer')),
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_qb', 'from_qb')),

    -- Reference to source entity
    reference_type TEXT CHECK (reference_type IN ('order', 'booking', 'inventory_item', 'menu_item', 'customer')),
    reference_id UUID,
    reference_number TEXT, -- Order number, booking reference, etc.

    -- QuickBooks transaction details
    qb_txn_id TEXT, -- QuickBooks Transaction ID
    qb_list_id TEXT, -- QuickBooks List ID (for entities)
    qb_edit_sequence TEXT, -- QuickBooks Edit Sequence for updates

    -- Request/Response data
    qbxml_request TEXT, -- Full QBXML request sent to QB
    qbxml_response TEXT, -- Full QBXML response from QB

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,

    -- Timestamps
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB, -- Additional sync-specific data

    CONSTRAINT sync_log_reference_check CHECK (
        (reference_type IS NOT NULL AND reference_id IS NOT NULL) OR
        (reference_type IS NULL AND reference_id IS NULL)
    )
);

-- Indexes for quickbooks_sync_log
CREATE INDEX idx_quickbooks_sync_log_status ON quickbooks_sync_log(status);
CREATE INDEX idx_quickbooks_sync_log_type ON quickbooks_sync_log(sync_type);
CREATE INDEX idx_quickbooks_sync_log_reference ON quickbooks_sync_log(reference_type, reference_id);
CREATE INDEX idx_quickbooks_sync_log_qb_txn ON quickbooks_sync_log(qb_txn_id) WHERE qb_txn_id IS NOT NULL;
CREATE INDEX idx_quickbooks_sync_log_created ON quickbooks_sync_log(created_at DESC);
CREATE INDEX idx_quickbooks_sync_log_failed ON quickbooks_sync_log(status) WHERE status = 'failed';
CREATE INDEX idx_quickbooks_sync_log_pending ON quickbooks_sync_log(status, retry_count) WHERE status = 'pending';

-- Trigger to update updated_at timestamp
CREATE TRIGGER quickbooks_sync_log_update_timestamp
    BEFORE UPDATE ON quickbooks_sync_log
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_config_timestamp();

-- ============================================================================
-- Table: quickbooks_item_mapping
-- Purpose: Maps Premier Hotel menu items and inventory items to QuickBooks items
-- ============================================================================
CREATE TABLE quickbooks_item_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hotel item reference
    hotel_item_id UUID NOT NULL,
    hotel_item_type TEXT NOT NULL CHECK (hotel_item_type IN ('menu_item', 'inventory_item')),
    hotel_item_name TEXT NOT NULL,
    hotel_item_sku TEXT,

    -- QuickBooks item reference
    qb_item_list_id TEXT NOT NULL, -- QuickBooks ItemRef ListID
    qb_item_full_name TEXT NOT NULL, -- QuickBooks item full name
    qb_edit_sequence TEXT, -- For tracking QB item version

    -- Sync configuration
    sync_inventory BOOLEAN DEFAULT true,
    sync_sales BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,

    -- Pricing synchronization
    sync_price BOOLEAN DEFAULT false,
    price_markup_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Last sync information
    last_synced TIMESTAMP,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'pending')),
    last_sync_error TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(hotel_item_id, hotel_item_type),
    UNIQUE(qb_item_list_id)
);

-- Indexes for quickbooks_item_mapping
CREATE INDEX idx_quickbooks_item_mapping_hotel_item ON quickbooks_item_mapping(hotel_item_id, hotel_item_type);
CREATE INDEX idx_quickbooks_item_mapping_qb_item ON quickbooks_item_mapping(qb_item_list_id);
CREATE INDEX idx_quickbooks_item_mapping_enabled ON quickbooks_item_mapping(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX idx_quickbooks_item_mapping_sku ON quickbooks_item_mapping(hotel_item_sku) WHERE hotel_item_sku IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER quickbooks_item_mapping_update_timestamp
    BEFORE UPDATE ON quickbooks_item_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_config_timestamp();

-- ============================================================================
-- Table: quickbooks_customer_mapping
-- Purpose: Maps Premier Hotel users/customers to QuickBooks customers
-- ============================================================================
CREATE TABLE quickbooks_customer_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hotel user reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_full_name TEXT,

    -- QuickBooks customer reference
    qb_customer_list_id TEXT NOT NULL, -- QuickBooks CustomerRef ListID
    qb_customer_name TEXT NOT NULL, -- QuickBooks customer display name
    qb_edit_sequence TEXT, -- For tracking QB customer version

    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT true,
    auto_create_in_qb BOOLEAN DEFAULT true,

    -- Last sync information
    last_synced TIMESTAMP,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'pending')),
    last_sync_error TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id),
    UNIQUE(qb_customer_list_id)
);

-- Indexes for quickbooks_customer_mapping
CREATE INDEX idx_quickbooks_customer_mapping_user ON quickbooks_customer_mapping(user_id);
CREATE INDEX idx_quickbooks_customer_mapping_qb_customer ON quickbooks_customer_mapping(qb_customer_list_id);
CREATE INDEX idx_quickbooks_customer_mapping_enabled ON quickbooks_customer_mapping(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX idx_quickbooks_customer_mapping_email ON quickbooks_customer_mapping(user_email);

-- Trigger to update updated_at timestamp
CREATE TRIGGER quickbooks_customer_mapping_update_timestamp
    BEFORE UPDATE ON quickbooks_customer_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_config_timestamp();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE quickbooks_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_item_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_customer_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and managers can view/edit QuickBooks configuration
CREATE POLICY quickbooks_config_admin_policy ON quickbooks_config
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- Policy: Only admins and managers can view sync logs
CREATE POLICY quickbooks_sync_log_admin_policy ON quickbooks_sync_log
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager', 'staff')
    );

-- Policy: Only admins can modify sync logs (system-generated)
CREATE POLICY quickbooks_sync_log_admin_modify_policy ON quickbooks_sync_log
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- Policy: Only admins and managers can view/edit item mappings
CREATE POLICY quickbooks_item_mapping_admin_policy ON quickbooks_item_mapping
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- Policy: Only admins and managers can view customer mappings
CREATE POLICY quickbooks_customer_mapping_admin_policy ON quickbooks_customer_mapping
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- Policy: Users can view their own customer mapping
CREATE POLICY quickbooks_customer_mapping_user_policy ON quickbooks_customer_mapping
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
    );

-- ============================================================================
-- Initial Configuration (Optional)
-- ============================================================================

-- Insert default configuration (will need to be updated by admin)
INSERT INTO quickbooks_config (
    company_file_path,
    web_connector_url,
    username,
    password_hash,
    sync_enabled
) VALUES (
    'C:\\ProgramData\\Intuit\\QuickBooks POS 13.0\\company.qbw',
    'http://localhost:8000/api/v1/quickbooks/connector',
    'admin',
    '', -- Will be set by admin
    false
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Helpful Views
-- ============================================================================

-- View: Failed syncs that need attention
CREATE OR REPLACE VIEW quickbooks_failed_syncs AS
SELECT
    id,
    sync_type,
    reference_type,
    reference_number,
    error_message,
    retry_count,
    created_at
FROM quickbooks_sync_log
WHERE status = 'failed'
    AND retry_count < max_retries
ORDER BY created_at DESC;

-- View: Recent sync activity
CREATE OR REPLACE VIEW quickbooks_recent_syncs AS
SELECT
    id,
    sync_type,
    sync_direction,
    reference_type,
    reference_number,
    status,
    synced_at,
    created_at
FROM quickbooks_sync_log
ORDER BY created_at DESC
LIMIT 100;

-- View: Sync statistics
CREATE OR REPLACE VIEW quickbooks_sync_stats AS
SELECT
    sync_type,
    status,
    COUNT(*) as count,
    MAX(synced_at) as last_sync
FROM quickbooks_sync_log
GROUP BY sync_type, status;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE quickbooks_config IS 'QuickBooks POS 2013 connection configuration and credentials';
COMMENT ON TABLE quickbooks_sync_log IS 'Audit trail for all QuickBooks synchronization operations';
COMMENT ON TABLE quickbooks_item_mapping IS 'Mapping between Hotel items and QuickBooks inventory items';
COMMENT ON TABLE quickbooks_customer_mapping IS 'Mapping between Hotel users and QuickBooks customers';

COMMENT ON COLUMN quickbooks_config.company_file_path IS 'Path to QuickBooks POS company file (.qbw)';
COMMENT ON COLUMN quickbooks_config.web_connector_url IS 'URL for QuickBooks Web Connector SOAP endpoint';
COMMENT ON COLUMN quickbooks_sync_log.qbxml_request IS 'Full QBXML request sent to QuickBooks';
COMMENT ON COLUMN quickbooks_sync_log.qbxml_response IS 'Full QBXML response received from QuickBooks';
COMMENT ON COLUMN quickbooks_item_mapping.qb_item_list_id IS 'QuickBooks unique identifier for the item';
COMMENT ON COLUMN quickbooks_customer_mapping.qb_customer_list_id IS 'QuickBooks unique identifier for the customer';

-- ============================================================================
-- End of QuickBooks Integration Schema
-- ============================================================================
