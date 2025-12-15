-- ============================================
-- Staff Management Tables
-- Phase 3 - Premier Hotel Management System
-- ============================================

-- Staff information table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff shifts table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type VARCHAR(20) CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night', 'full_day')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff attendance table
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- Staff performance/evaluations table
CREATE TABLE IF NOT EXISTS public.staff_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    evaluator_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff leave requests table
CREATE TABLE IF NOT EXISTS public.staff_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff(department);

CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.staff_shifts(status);

CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.staff_attendance(date);

CREATE INDEX IF NOT EXISTS idx_performance_staff_id ON public.staff_performance(staff_id);
CREATE INDEX IF NOT EXISTS idx_performance_date ON public.staff_performance(evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_leaves_staff_id ON public.staff_leaves(staff_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.staff_leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.staff_leaves(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff table

-- Staff can view their own record
CREATE POLICY "Staff can view own record"
    ON public.staff
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admin and managers can view all staff
CREATE POLICY "Admin and managers can view all staff"
    ON public.staff
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Only admin and managers can insert/update/delete staff
CREATE POLICY "Admin and managers can manage staff"
    ON public.staff
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to staff"
    ON public.staff
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for staff_shifts table

-- Staff can view their own shifts
CREATE POLICY "Staff can view own shifts"
    ON public.staff_shifts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_shifts.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Admin and managers can view all shifts
CREATE POLICY "Admin and managers can view all shifts"
    ON public.staff_shifts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Admin and managers can manage shifts
CREATE POLICY "Admin and managers can manage shifts"
    ON public.staff_shifts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to shifts"
    ON public.staff_shifts
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for staff_attendance

-- Staff can view their own attendance
CREATE POLICY "Staff can view own attendance"
    ON public.staff_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_attendance.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Staff can insert their own attendance (check-in/out)
CREATE POLICY "Staff can record own attendance"
    ON public.staff_attendance
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_attendance.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Staff can update their own attendance
CREATE POLICY "Staff can update own attendance"
    ON public.staff_attendance
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_attendance.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Admin and managers can view all attendance
CREATE POLICY "Admin and managers can view all attendance"
    ON public.staff_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to attendance"
    ON public.staff_attendance
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for staff_performance

-- Staff can view their own evaluations
CREATE POLICY "Staff can view own evaluations"
    ON public.staff_performance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_performance.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Admin and managers can view and create evaluations
CREATE POLICY "Admin and managers can manage evaluations"
    ON public.staff_performance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to performance"
    ON public.staff_performance
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for staff_leaves

-- Staff can view their own leave requests
CREATE POLICY "Staff can view own leaves"
    ON public.staff_leaves
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_leaves.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Staff can create their own leave requests
CREATE POLICY "Staff can create own leave requests"
    ON public.staff_leaves
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_leaves.staff_id
            AND staff.user_id = auth.uid()
        )
    );

-- Staff can update their own pending leave requests
CREATE POLICY "Staff can update own pending leaves"
    ON public.staff_leaves
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_leaves.staff_id
            AND staff.user_id = auth.uid()
            AND staff_leaves.status = 'pending'
        )
    );

-- Admin and managers can view all leaves
CREATE POLICY "Admin and managers can view all leaves"
    ON public.staff_leaves
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Admin and managers can approve/reject leaves
CREATE POLICY "Admin and managers can manage leaves"
    ON public.staff_leaves
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = auth.uid()
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to leaves"
    ON public.staff_leaves
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON public.staff_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_leaves_updated_at BEFORE UPDATE ON public.staff_leaves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.staff IS 'Staff member information';
COMMENT ON TABLE public.staff_shifts IS 'Staff work shift schedules';
COMMENT ON TABLE public.staff_attendance IS 'Daily attendance tracking for staff';
COMMENT ON TABLE public.staff_performance IS 'Staff performance evaluations';
COMMENT ON TABLE public.staff_leaves IS 'Staff leave requests and approvals';
