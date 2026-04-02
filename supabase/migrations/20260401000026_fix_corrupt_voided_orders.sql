-- Fix corrupt orders where all items have voided=true but status was never
-- updated to 'cancelled' (caused by the void-receipt DB constraint bug).
-- Sets status='cancelled' and is_voided=true for any order where every item
-- in the JSONB array has voided=true, but the order is not already cancelled.

UPDATE public.orders
SET
  status     = 'cancelled',
  is_voided  = TRUE,
  subtotal   = 0,
  tax        = 0,
  total_amount = 0,
  updated_at = NOW()
WHERE
  status NOT IN ('cancelled', 'canceled')
  AND is_voided IS NOT TRUE
  AND jsonb_array_length(items) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(items) AS item
    WHERE (item->>'voided')::boolean IS NOT TRUE
  );
