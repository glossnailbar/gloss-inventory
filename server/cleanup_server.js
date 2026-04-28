const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function cleanup() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  console.log('Cleaning up server data...');
  
  // Delete inventory_levels first (foreign key constraint)
  const invResult = await pool.query(
    'DELETE FROM inventory_levels WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted inventory_levels:', invResult.rowCount);
  
  // Delete products
  const prodResult = await pool.query(
    'DELETE FROM products WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted products:', prodResult.rowCount);
  
  // Delete categories
  const catResult = await pool.query(
    'DELETE FROM categories WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted categories:', catResult.rowCount);
  
  // Delete vendors
  const vendResult = await pool.query(
    'DELETE FROM vendors WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted vendors:', vendResult.rowCount);
  
  // Delete locations
  const locResult = await pool.query(
    'DELETE FROM locations WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted locations:', locResult.rowCount);
  
  // Delete sync_queue
  const queueResult = await pool.query(
    'DELETE FROM sync_queue WHERE organization_id = $1',
    [orgId]
  );
  console.log('Deleted sync_queue:', queueResult.rowCount);
  
  await pool.end();
  console.log('Cleanup complete!');
}

cleanup();
