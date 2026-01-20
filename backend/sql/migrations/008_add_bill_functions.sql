-- Migration 008: Add Bill Helper Functions
-- Run this AFTER migrations 006 and 007 are successful
-- This creates helper functions that need both bills and orders tables

-- Function to calculate bill totals from associated orders
CREATE OR REPLACE FUNCTION calculate_bill_totals(p_bill_id UUID)
RETURNS TABLE(subtotal DECIMAL, tax DECIMAL, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(o.subtotal), 0)::DECIMAL as subtotal,
        COALESCE(SUM(o.tax), 0)::DECIMAL as tax,
        COALESCE(SUM(o.total_amount), 0)::DECIMAL as total
    FROM bill_orders bo
    INNER JOIN orders o ON bo.order_id = o.id
    WHERE bo.bill_id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Bill helper functions created!' as status;
