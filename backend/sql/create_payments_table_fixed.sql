-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reference_type VARCHAR(20) NOT NULL CHECK (reference_type IN ('booking', 'order')),
    reference_id UUID NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('mpesa', 'cash', 'card')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'KES',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- M-Pesa specific fields
    mpesa_checkout_request_id VARCHAR(255),
    mpesa_transaction_id VARCHAR(255),
    mpesa_phone_number VARCHAR(20),

    -- Card payment fields
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),

    -- Additional fields
    description TEXT,
    metadata JSONB,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_checkout ON public.payments(mpesa_checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON public.payments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own payments
CREATE POLICY "Users can create own payments"
    ON public.payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending payments (for cancellation)
CREATE POLICY "Users can update own pending payments"
    ON public.payments
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access"
    ON public.payments
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;
