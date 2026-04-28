const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  // Check all locations
  const locs = await pool.query(
    'SELECT id, local_id, name, created_at FROM locations WHERE organization_id = $1 ORDER BY created_at',
    [orgId]
  );
  console.log('Locations:', locs.rows);
  
  // Check inventory_levels grouped by location
  const invByLoc = await pool.query(
    `SELECT l.name, COUNT(il.id) as inv_count, SUM(il.quantity_on_hand) as total_qty
     FROM inventory_levels il
     JOIN locations l ON il.location_id = l.id
     WHERE il.organization_id = $1
     GROUP BY l.name`,
    [orgId]
  );
  console.log('Inventory by location:', invByLoc.rows);
  
  // Check products with their location info
  const prods = await pool.query(
    `SELECT COUNT(*) as total,
            COUNT(CASE WHEN il.quantity_on_hand > 0 THEN 1 END) as with_qty
     FROM products p
     LEFT JOIN inventory_levels il ON p.id = il.product_id
     WHERE p.organization_id = $1`,
    [orgId]
  );
  console.log('Products with/without qty:', prods.rows[0]);
  
  await pool.end();
}

check();
