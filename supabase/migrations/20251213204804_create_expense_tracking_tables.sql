-- =====================================================
-- Expense Tracking System Schema
-- Phase 3 - Feature 6
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Expense Categories Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('operational', 'maintenance', 'supplies', 'utilities', 'payroll', 'marketing', 'other')),
    icon VARCHAR(50),
    budget_limit DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Expenses Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,

    -- Category and Type
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN ('operational', 'maintenance', 'supplies', 'utilities', 'payroll', 'marketing', 'other')),

    -- Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    vendor_name VARCHAR(200),
    invoice_number VARCHAR(100),

    -- Financial
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Dates
    expense_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'other')),

    -- Approval
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,

    -- Attachments
    receipt_url TEXT,
    invoice_url TEXT,

    -- Recurring
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    recurring_until DATE,

    -- Tags and Notes
    tags TEXT[], -- Array of tags for categorization
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Budgets Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_number VARCHAR(50) UNIQUE NOT NULL,

    -- Period
    name VARCHAR(200) NOT NULL,
    description TEXT,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Financial
    total_budget DECIMAL(12,2) NOT NULL CHECK (total_budget > 0),
    allocated_amount DECIMAL(12,2) DEFAULT 0,
    spent_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_budget - spent_amount) STORED,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

    -- Ownership
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure valid period
    CHECK (end_date > start_date)
);

-- =====================================================
-- Budget Allocations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,

    -- Allocation
    allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,

    -- Alerts
    alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent >= 0 AND alert_threshold_percent <= 100),
    alert_triggered BOOLEAN DEFAULT false,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(budget_id, category_id)
);

-- =====================================================
-- Expense Payments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,

    -- Payment Details
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'other')),

    -- References
    transaction_reference VARCHAR(100),
    check_number VARCHAR(50),

    -- Processing
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Expense Approvals Table (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,

    -- Approval Details
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled')),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),

    -- Feedback
    comments TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Expense Categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON public.expense_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(is_active);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_number ON public.expenses(expense_number);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON public.expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON public.expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses(approved_by);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON public.expenses(status, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_type_status ON public.expenses(expense_type, status);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_number ON public.budgets(budget_number);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON public.budgets(created_by);

-- Budget Allocations
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget ON public.budget_allocations(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_category ON public.budget_allocations(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_alert ON public.budget_allocations(alert_triggered);

-- Expense Payments
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense ON public.expense_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_date ON public.expense_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_payments_number ON public.expense_payments(payment_number);

-- Expense Approvals
CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense ON public.expense_approvals(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver ON public.expense_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_date ON public.expense_approvals(created_at DESC);

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================

-- Update expense categories updated_at
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_categories_updated_at();

-- Update expenses updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- Update budgets updated_at
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();

-- Update budget allocations updated_at
CREATE OR REPLACE FUNCTION update_budget_allocations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_budget_allocations_updated_at
    BEFORE UPDATE ON public.budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_allocations_updated_at();

-- Automatically update budget spent amount when expense is paid
CREATE OR REPLACE FUNCTION update_budget_spent_on_expense_payment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Update budget allocation
        UPDATE public.budget_allocations ba
        SET spent_amount = spent_amount + NEW.total_amount
        WHERE ba.category_id = NEW.category_id
        AND ba.budget_id IN (
            SELECT id FROM public.budgets
            WHERE status = 'active'
            AND start_date <= NEW.expense_date
            AND end_date >= NEW.expense_date
        );

        -- Update main budget
        UPDATE public.budgets b
        SET spent_amount = spent_amount + NEW.total_amount
        WHERE b.status = 'active'
        AND b.start_date <= NEW.expense_date
        AND b.end_date >= NEW.expense_date;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_budget_spent_on_expense_payment
    AFTER UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_spent_on_expense_payment();

-- Log approval actions
CREATE OR REPLACE FUNCTION log_expense_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO public.expense_approvals (expense_id, approver_id, action, previous_status, new_status)
        VALUES (NEW.id, NEW.approved_by, NEW.status, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_expense_approval
    AFTER UPDATE ON public.expenses
    FOR EACH ROW
    WHEN (NEW.status != OLD.status)
    EXECUTE FUNCTION log_expense_approval();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;

-- Expense Categories Policies
CREATE POLICY "Anyone can view active categories"
    ON public.expense_categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Managers can manage categories"
    ON public.expense_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Expenses Policies
CREATE POLICY "Staff can view all expenses"
    ON public.expenses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can create expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can update own pending expenses"
    ON public.expenses FOR UPDATE
    USING (
        submitted_by = (select auth.uid()) AND status = 'pending'
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers can approve expenses"
    ON public.expenses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Budgets Policies
CREATE POLICY "Staff can view budgets"
    ON public.budgets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Managers can manage budgets"
    ON public.budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Budget Allocations Policies
CREATE POLICY "Staff can view budget allocations"
    ON public.budget_allocations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Managers can manage budget allocations"
    ON public.budget_allocations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Expense Payments Policies
CREATE POLICY "Staff can view payments"
    ON public.expense_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Managers can manage payments"
    ON public.expense_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Expense Approvals Policies
CREATE POLICY "Staff can view approvals"
    ON public.expense_approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to expense_categories"
    ON public.expense_categories FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to expenses"
    ON public.expenses FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to budgets"
    ON public.budgets FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to budget_allocations"
    ON public.budget_allocations FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to expense_payments"
    ON public.expense_payments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to expense_approvals"
    ON public.expense_approvals FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- Insert Default Expense Categories
-- =====================================================
INSERT INTO public.expense_categories (name, description, category_type, icon, budget_limit, display_order) VALUES
    ('Utilities', 'Electricity, water, gas, internet', 'utilities', 'Zap', 5000.00, 1),
    ('Maintenance', 'Building and equipment maintenance', 'maintenance', 'Wrench', 3000.00, 2),
    ('Supplies', 'Office and operational supplies', 'supplies', 'Package', 2000.00, 3),
    ('Housekeeping Supplies', 'Cleaning supplies and materials', 'supplies', 'Sparkles', 1500.00, 4),
    ('Staff Salaries', 'Employee payroll', 'payroll', 'Users', 50000.00, 5),
    ('Marketing', 'Advertising and promotions', 'marketing', 'Megaphone', 4000.00, 6),
    ('Food & Beverages', 'Restaurant and kitchen expenses', 'operational', 'UtensilsCrossed', 10000.00, 7),
    ('Insurance', 'Property and liability insurance', 'operational', 'Shield', 2000.00, 8),
    ('Technology', 'Software, hardware, IT services', 'operational', 'Laptop', 3000.00, 9),
    ('Other', 'Miscellaneous expenses', 'other', 'MoreHorizontal', 1000.00, 10)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.expense_categories IS 'Categories for organizing expenses';
COMMENT ON TABLE public.expenses IS 'Hotel expense records with approval workflow';
COMMENT ON TABLE public.budgets IS 'Budget planning and tracking';
COMMENT ON TABLE public.budget_allocations IS 'Budget allocations by category';
COMMENT ON TABLE public.expense_payments IS 'Payment records for expenses';
COMMENT ON TABLE public.expense_approvals IS 'Audit trail for expense approvals';
