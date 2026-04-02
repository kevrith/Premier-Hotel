-- Add is_voided flag to orders table
-- The orders.status CHECK constraint does not include 'voided', so we use
-- status='cancelled' + is_voided=true to represent a voided receipt.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.orders.is_voided IS
  'TRUE when the entire receipt was voided by a manager. status will be ''cancelled''.';

CREATE INDEX IF NOT EXISTS idx_orders_is_voided ON public.orders(is_voided)
  WHERE is_voided = TRUE;
