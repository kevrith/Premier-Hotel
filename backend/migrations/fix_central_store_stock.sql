-- =============================================================================
-- Fix Central Store remaining quantities
-- Run each block in Supabase SQL Editor (PostgreSQL)
-- =============================================================================

-- 1. Diagnostic — run this first to confirm item names match
SELECT
  mi.name,
  ls.quantity,
  ls.unit,
  ls.updated_at
FROM location_stock ls
JOIN menu_items mi ON mi.id  = ls.menu_item_id
JOIN locations   l ON l.id   = ls.location_id
WHERE l.type = 'store'
  AND l.is_active = TRUE
  AND (
    LOWER(mi.name) LIKE '%balozi%'
    OR (LOWER(mi.name) LIKE '%guinness%' AND LOWER(mi.name) LIKE '%kubwa%')
    OR (LOWER(mi.name) LIKE '%kc%'       AND LOWER(mi.name) LIKE '%ginger%')
  )
ORDER BY mi.name;


-- 2. Fix Balozi → 50 remaining
UPDATE location_stock
SET    quantity   = 50,
       updated_at = NOW()
WHERE  location_id = (
         SELECT id FROM locations
         WHERE type = 'store' AND is_active = TRUE
         ORDER BY name LIMIT 1
       )
  AND  menu_item_id = (
         SELECT id FROM menu_items
         WHERE LOWER(name) LIKE '%balozi%'
         LIMIT 1
       );


-- 3. Fix KC Ginger → 12 remaining
UPDATE location_stock
SET    quantity   = 12,
       updated_at = NOW()
WHERE  location_id = (
         SELECT id FROM locations
         WHERE type = 'store' AND is_active = TRUE
         ORDER BY name LIMIT 1
       )
  AND  menu_item_id = (
         SELECT id FROM menu_items
         WHERE LOWER(name) LIKE '%kc%' AND LOWER(name) LIKE '%ginger%'
         LIMIT 1
       );


-- 4. Fix Guinness Kubwa → 150 (full received stock, nothing transferred out)
UPDATE location_stock
SET    quantity   = 150,
       updated_at = NOW()
WHERE  location_id = (
         SELECT id FROM locations
         WHERE type = 'store' AND is_active = TRUE
         ORDER BY name LIMIT 1
       )
  AND  menu_item_id = (
         SELECT id FROM menu_items
         WHERE LOWER(name) LIKE '%guinness%' AND LOWER(name) LIKE '%kubwa%'
         LIMIT 1
       );


-- 5. Verify — re-run after updates to confirm
SELECT
  mi.name,
  ls.quantity,
  ls.unit,
  ls.updated_at
FROM location_stock ls
JOIN menu_items mi ON mi.id  = ls.menu_item_id
JOIN locations   l ON l.id   = ls.location_id
WHERE l.type = 'store'
  AND l.is_active = TRUE
  AND (
    LOWER(mi.name) LIKE '%balozi%'
    OR (LOWER(mi.name) LIKE '%guinness%' AND LOWER(mi.name) LIKE '%kubwa%')
    OR (LOWER(mi.name) LIKE '%kc%'       AND LOWER(mi.name) LIKE '%ginger%')
  )
ORDER BY mi.name;
