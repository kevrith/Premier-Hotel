-- Add item-linking to discount_configs
-- applicable_item_ids: NULL = general discount (applies to anything)
--                      array of menu item UUIDs = only applies to those items

ALTER TABLE public.discount_configs
    ADD COLUMN IF NOT EXISTS applicable_item_ids UUID[] DEFAULT NULL;
