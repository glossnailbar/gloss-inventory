const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function clean() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  await pool.query('DELETE FROM inventory_levels WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM products WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM categories WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM vendors WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM locations WHERE organization_id = $1', [orgId]);
  console.log('Cleaned all data');
  await pool.end();
}
clean();
