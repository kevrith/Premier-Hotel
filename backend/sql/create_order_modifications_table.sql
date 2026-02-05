-- Create order_modifications table for order void requests and modifications
CREATE TABLE public.order_modifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    modification_type TEXT NOT NULL CHECK (modification_type IN ('void', 'reverse', 'discount', 'price_adjustment')),
    reason TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES public.profiles(id),
    rejected_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create order_reversals table for complete order reversals
CREATE TABLE public.order_reversals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    reversed_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reversed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS for order_modifications
ALTER TABLE public.order_modifications ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view all modifications
CREATE POLICY "Staff can view all modifications"
    ON public.order_modifications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));

-- Policy: Staff can create modifications
CREATE POLICY "Staff can create modifications"
    ON public.order_modifications FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));

-- Policy: Staff can update modifications (approve/reject)
CREATE POLICY "Staff can update modifications"
    ON public.order_modifications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Enable RLS for order_reversals
ALTER TABLE public.order_reversals ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view all reversals
CREATE POLICY "Staff can view all reversals"
    ON public.order_reversals FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));

-- Policy: Staff can create reversals
CREATE POLICY "Staff can create reversals"
    ON public.order_reversals FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Add updated_at trigger for order_modifications
CREATE TRIGGER update_order_modifications_updated_at BEFORE UPDATE ON public.order_modifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for order_reversals
CREATE TRIGGER update_order_reversals_updated_at BEFORE UPDATE ON public.order_reversals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_order_modifications_order_id ON public.order_modifications(order_id);
CREATE INDEX idx_order_modifications_status ON public.order_modifications(status);
CREATE INDEX idx_order_modifications_requested_by ON public.order_modifications(requested_by);
CREATE INDEX idx_order_modifications_approved_by ON public.order_modifications(approved_by);

CREATE INDEX idx_order_reversals_order_id ON public.order_reversals(order_id);
CREATE INDEX idx_order_reversals_reversed_by ON public.order_reversals(reversed_by);
