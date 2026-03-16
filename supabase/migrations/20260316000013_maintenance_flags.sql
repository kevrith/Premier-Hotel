-- Maintenance flags: cleaners report room repair/maintenance issues
-- Managers/Admin/Owner can view and resolve them

CREATE TABLE IF NOT EXISTS maintenance_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    task_id UUID REFERENCES housekeeping_tasks(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('plumbing', 'electrical', 'furniture', 'hvac', 'appliance', 'structural', 'cleanliness', 'linen', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linen & room inventory items (separate from cleaning supplies)
CREATE TABLE IF NOT EXISTS room_linen_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'linen' CHECK (category IN ('linen', 'towel', 'pillow', 'blanket', 'mattress', 'curtain', 'other')),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    in_use_quantity INTEGER NOT NULL DEFAULT 0,
    in_laundry_quantity INTEGER NOT NULL DEFAULT 0,
    damaged_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (
        GREATEST(0, total_quantity - in_use_quantity - in_laundry_quantity - damaged_quantity)
    ) STORED,
    reorder_level INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'piece',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linen movement log (check-in/check-out per room)
CREATE TABLE IF NOT EXISTS linen_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linen_item_id UUID REFERENCES room_linen_inventory(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    task_id UUID REFERENCES housekeeping_tasks(id) ON DELETE SET NULL,
    moved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('issued', 'returned', 'sent_to_laundry', 'returned_from_laundry', 'damaged', 'disposed')),
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_flags_room ON maintenance_flags(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_flags_status ON maintenance_flags(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_flags_reported_by ON maintenance_flags(reported_by);
CREATE INDEX IF NOT EXISTS idx_linen_movements_room ON linen_movements(room_id);
CREATE INDEX IF NOT EXISTS idx_linen_movements_item ON linen_movements(linen_item_id);

-- Seed some default linen items
INSERT INTO room_linen_inventory (item_name, category, total_quantity, unit) VALUES
    ('Bath Towel',        'towel',   50, 'piece'),
    ('Hand Towel',        'towel',   50, 'piece'),
    ('Face Towel',        'towel',   50, 'piece'),
    ('Bed Sheet (Single)', 'linen',  40, 'piece'),
    ('Bed Sheet (Double)', 'linen',  40, 'piece'),
    ('Pillow Case',       'pillow',  60, 'piece'),
    ('Pillow',            'pillow',  30, 'piece'),
    ('Duvet Cover',       'linen',   30, 'piece'),
    ('Blanket',           'blanket', 30, 'piece'),
    ('Bath Mat',          'towel',   30, 'piece')
ON CONFLICT DO NOTHING;
