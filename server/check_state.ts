import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:pFMGWLFXNvypKigaCWtAZEeWxHHwgLTg@monorail.proxy.rlwy.net:35829/railway',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const orgId = 'cbe1d396-65f1-41ec-9c51-a471cfa836a1';
  
  try {
    // Check all tables
    const tables = ['products', 'locations', 'inventory_levels'];
    for (const table of tables) {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM ' + table + ' WHERE organization_id = $1',
        [orgId]
      );
      console.log(table + ':', result.rows[0].count);
    }
    
    // Check inventory_levels detail
    const inv = await pool.query(
      'SELECT COUNT(*) as count, SUM(quantity_on_hand) as total_qty FROM inventory_levels WHERE organization_id = $1',
      [orgId]
    );
    console.log('inventory_levels detail:', inv.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await pool.end();
}

check();
