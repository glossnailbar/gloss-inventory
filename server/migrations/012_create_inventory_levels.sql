-- Migration: Ensure inventory_levels exist for all products
-- Run this in Railway SQL editor

-- Step 1: Check if locations exist, create default if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM locations LIMIT 1) THEN
        INSERT INTO locations (id, local_id, organization_id, name, is_active, sync_status, sync_version, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'default-location',
            '11111111-1111-1111-1111-111111111111',
            'Default',
            true,
            'synced',
            1,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Step 2: Create inventory_levels for all products that don't have them
-- Uses the first available location
INSERT INTO inventory_levels (
    id, local_id, product_id, location_id,
    quantity_on_hand, quantity_reserved, organization_id,
    sync_version, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    gen_random_uuid()::text,
    p.id,
    (SELECT id FROM locations LIMIT 1),
    0,
    0,
    p.organization_id,
    1,
    NOW(),
    NOW()
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_levels il WHERE il.product_id = p.id
)
ON CONFLICT DO NOTHING;

-- Step 3: Verify results
SELECT 
    'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 
    'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 
    'Locations', COUNT(*) FROM locations
UNION ALL
SELECT 
    'Inventory Levels', COUNT(*) FROM inventory_levels;