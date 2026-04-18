-- Ensure all products have local_id
UPDATE products 
SET local_id = id::text 
WHERE local_id IS NULL;

-- Ensure all locations have local_id
UPDATE locations 
SET local_id = id::text 
WHERE local_id IS NULL;

-- Ensure all inventory_levels have local_id
UPDATE inventory_levels 
SET local_id = id::text 
WHERE local_id IS NULL;

-- Ensure all categories have local_id
UPDATE categories 
SET local_id = id::text 
WHERE local_id IS NULL;

-- Ensure all vendors have local_id
UPDATE vendors 
SET local_id = id::text 
WHERE local_id IS NULL;
