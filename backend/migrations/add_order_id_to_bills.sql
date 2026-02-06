-- Add order_id to bills table to link bills to orders
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON public.bills(order_id);

COMMENT ON COLUMN bills.order_id IS 'Links bill to the order it was created from';
