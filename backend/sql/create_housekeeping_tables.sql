-- ============================================
-- Housekeeping Management Tables
-- Phase 3 - Premier Hotel Management System
-- ============================================

-- Housekeeping tasks table
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('cleaning', 'inspection', 'maintenance', 'turndown', 'deep_clean', 'laundry')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    notes TEXT,
    issues_found TEXT,
    supplies_used JSONB, -- Array of supplies with quantities
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room inspections table
CREATE TABLE IF NOT EXISTS public.room_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
    inspector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Inspection scores (1-5 scale)
    cleanliness_score INTEGER CHECK (cleanliness_score BETWEEN 1 AND 5),
    maintenance_score INTEGER CHECK (maintenance_score BETWEEN 1 AND 5),
    amenities_score INTEGER CHECK (amenities_score BETWEEN 1 AND 5),
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 5),

    -- Inspection details
    checklist JSONB, -- Detailed checklist with items and status
    maintenance_issues TEXT,
    missing_items TEXT,
    damaged_items TEXT,
    photos JSONB, -- Array of photo URLs

    -- Inspection result
    status VARCHAR(20) DEFAULT 'passed' CHECK (status IN ('passed', 'failed', 'needs_attention', 'excellent')),
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Housekeeping supplies/inventory tracking
CREATE TABLE IF NOT EXISTS public.housekeeping_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'cleaning', 'toiletries', 'linens', 'equipment'
    unit VARCHAR(50) NOT NULL, -- 'pieces', 'bottles', 'kg', etc.
    current_stock DECIMAL(10,2) DEFAULT 0,
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    reorder_quantity DECIMAL(10,2),
    unit_cost DECIMAL(10,2),
    storage_location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supply usage log
CREATE TABLE IF NOT EXISTS public.supply_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supply_id UUID NOT NULL REFERENCES public.housekeeping_supplies(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Housekeeping schedules (for recurring tasks)
CREATE TABLE IF NOT EXISTS public.housekeeping_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
    preferred_time TIME,
    assigned_to UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_scheduled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lost and found items
CREATE TABLE IF NOT EXISTS public.lost_and_found (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'electronics', 'clothing', 'jewelry', 'documents', 'other'
    found_location VARCHAR(200), -- Room number or area
    room_id UUID REFERENCES public.rooms(id),
    found_by UUID REFERENCES auth.users(id),
    found_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Guest information (if identified)
    guest_id UUID REFERENCES auth.users(id),
    guest_name VARCHAR(200),
    guest_contact VARCHAR(200),

    -- Item status
    status VARCHAR(20) DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'disposed', 'donated')),
    claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_by VARCHAR(200),

    -- Storage
    storage_location VARCHAR(200),
    photo_url TEXT,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON public.housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_assigned_to ON public.housekeeping_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_status ON public.housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_priority ON public.housekeeping_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_scheduled_time ON public.housekeeping_tasks(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_type ON public.housekeeping_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_room_inspections_room_id ON public.room_inspections(room_id);
CREATE INDEX IF NOT EXISTS idx_room_inspections_inspector_id ON public.room_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_room_inspections_date ON public.room_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_room_inspections_status ON public.room_inspections(status);

CREATE INDEX IF NOT EXISTS idx_housekeeping_supplies_category ON public.housekeeping_supplies(category);
CREATE INDEX IF NOT EXISTS idx_housekeeping_supplies_status ON public.housekeeping_supplies(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_supplies_stock ON public.housekeeping_supplies(current_stock);

CREATE INDEX IF NOT EXISTS idx_supply_usage_supply_id ON public.supply_usage(supply_id);
CREATE INDEX IF NOT EXISTS idx_supply_usage_task_id ON public.supply_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_supply_usage_date ON public.supply_usage(used_at DESC);

CREATE INDEX IF NOT EXISTS idx_housekeeping_schedules_room_id ON public.housekeeping_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_schedules_active ON public.housekeeping_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_housekeeping_schedules_next ON public.housekeeping_schedules(next_scheduled_at);

CREATE INDEX IF NOT EXISTS idx_lost_found_status ON public.lost_and_found(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_room_id ON public.lost_and_found(room_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_date ON public.lost_and_found(found_date DESC);

-- Enable Row Level Security
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;

-- RLS Policies for housekeeping_tasks

-- Cleaners can view their assigned tasks
CREATE POLICY "Cleaners can view assigned tasks"
    ON public.housekeeping_tasks
    FOR SELECT
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner')
        )
    );

-- Cleaners can update their assigned tasks
CREATE POLICY "Cleaners can update assigned tasks"
    ON public.housekeeping_tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Admin and managers can create tasks
CREATE POLICY "Admin and managers can create tasks"
    ON public.housekeeping_tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Admin and managers can delete tasks
CREATE POLICY "Admin and managers can delete tasks"
    ON public.housekeeping_tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to tasks"
    ON public.housekeeping_tasks
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for room_inspections

-- Inspectors and managers can view inspections
CREATE POLICY "Staff can view inspections"
    ON public.room_inspections
    FOR SELECT
    USING (
        inspector_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner')
        )
    );

-- Managers can create inspections
CREATE POLICY "Managers can create inspections"
    ON public.room_inspections
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to inspections"
    ON public.room_inspections
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for housekeeping_supplies

-- Staff can view supplies
CREATE POLICY "Staff can view supplies"
    ON public.housekeeping_supplies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner', 'staff')
        )
    );

-- Managers can manage supplies
CREATE POLICY "Managers can manage supplies"
    ON public.housekeeping_supplies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to supplies"
    ON public.housekeeping_supplies
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for supply_usage

-- Staff can view usage logs
CREATE POLICY "Staff can view usage logs"
    ON public.supply_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner', 'staff')
        )
    );

-- Staff can log their own usage
CREATE POLICY "Staff can log usage"
    ON public.supply_usage
    FOR INSERT
    WITH CHECK (
        used_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to usage"
    ON public.supply_usage
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for housekeeping_schedules

-- Staff can view schedules
CREATE POLICY "Staff can view schedules"
    ON public.housekeeping_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner', 'staff')
        )
    );

-- Managers can manage schedules
CREATE POLICY "Managers can manage schedules"
    ON public.housekeeping_schedules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to schedules"
    ON public.housekeeping_schedules
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for lost_and_found

-- Staff can view lost and found
CREATE POLICY "Staff can view lost and found"
    ON public.lost_and_found
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner', 'staff')
        )
    );

-- Staff can create entries
CREATE POLICY "Staff can create lost and found entries"
    ON public.lost_and_found
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'cleaner', 'staff')
        )
    );

-- Managers can update entries
CREATE POLICY "Managers can update lost and found"
    ON public.lost_and_found
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to lost and found"
    ON public.lost_and_found
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create triggers for updated_at
CREATE TRIGGER update_housekeeping_tasks_updated_at BEFORE UPDATE ON public.housekeeping_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_housekeeping_supplies_updated_at BEFORE UPDATE ON public.housekeeping_supplies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_housekeeping_schedules_updated_at BEFORE UPDATE ON public.housekeeping_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lost_and_found_updated_at BEFORE UPDATE ON public.lost_and_found
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.housekeeping_tasks IS 'Housekeeping tasks for room cleaning and maintenance';
COMMENT ON TABLE public.room_inspections IS 'Room quality inspections and checks';
COMMENT ON TABLE public.housekeeping_supplies IS 'Inventory of housekeeping supplies';
COMMENT ON TABLE public.supply_usage IS 'Log of supply usage per task';
COMMENT ON TABLE public.housekeeping_schedules IS 'Recurring housekeeping task schedules';
COMMENT ON TABLE public.lost_and_found IS 'Lost and found items registry';
